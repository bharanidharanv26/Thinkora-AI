import "server-only";
import mammoth from "mammoth";
import yauzl from "yauzl";
import { randomUUID } from "node:crypto";
import { admin } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { MAX_SYLLABUS_BYTES, syllabusFormat, type SignedSyllabusUpload } from "@/lib/syllabus-files";
import { extractSyllabus } from "./ai";
import { HttpError, rateLimit, unwrap } from "./http";
import { signUploadTicket, verifyUploadTicket } from "./upload-tickets";

type CourseOwner = Pick<Profile, "id" | "role">;

export async function prepareSyllabusUpload(owner: CourseOwner, name: string, size: number): Promise<SignedSyllabusUpload> {
  const format = syllabusFormat(name);
  if (!format) throw new HttpError(415, "Supported files: PDF, PNG, JPEG, WebP, DOCX and TXT.");
  if (!Number.isInteger(size) || size <= 0 || size > MAX_SYLLABUS_BYTES) throw new HttpError(413, "Choose a non-empty file up to 10 MB.");
  await removeAbandonedUploads(owner.id);
  const path = `${owner.id}/${randomUUID()}.${format.extension}`;
  const signed = unwrap<{ token: string }>(await admin().storage.from("syllabuses").createSignedUploadUrl(path, { upsert: false }));
  return { path, token: signed.token, ticket: signUploadTicket(owner.id, path, size), contentType: format.mime };
}

// Direct-to-storage uploads can be abandoned before processing. Keep the
// private bucket bounded by removing files no course references after a day.
async function removeAbandonedUploads(owner: string) {
  try {
    const db = admin();
    const files = unwrap<{ name: string; created_at: string | null }[] | null>(await db.storage.from("syllabuses").list(owner, { limit: 1000 }));
    const cutoff = Date.now() - 24 * 3600000;
    const stale = (files ?? []).filter(file => !!file.created_at && new Date(file.created_at).getTime() < cutoff).map(file => `${owner}/${file.name}`);
    if (!stale.length) return;
    const referenced = unwrap<{ source_path: string | null }[]>(await db.from("courses").select("source_path").in("source_path", stale));
    const used = new Set(referenced.map(course => course.source_path));
    const abandoned = stale.filter(path => !used.has(path));
    if (abandoned.length) await db.storage.from("syllabuses").remove(abandoned);
  } catch (error) {
    console.error("Could not clean up abandoned uploads", error instanceof Error ? error.name : "Unknown error");
  }
}

export async function createUploadedCourse(owner: CourseOwner, input: { grade: string; subject: string; text: string; ticket?: string }) {
  const form = new FormData();
  form.set("grade", input.grade); form.set("subject", input.subject); form.set("text", input.text);
  if (!input.ticket) return uploadSyllabus(owner, form);
  const upload = verifyUploadTicket(input.ticket, owner.id);
  const db = admin();
  // Retrying a response lost after a successful save returns the same course.
  const existing = unwrap<{ id: string } | null>(await db.from("courses").select("id").eq("owner_id", owner.id).eq("source_path", upload.path).is("deleted_at", null).limit(1).maybeSingle());
  if (existing) return existing;
  await rateLimit(`${owner.id}:${upload.path}`, "syllabus-processing", 1, 300);
  const downloaded = await db.storage.from("syllabuses").download(upload.path);
  if (downloaded.error || !downloaded.data) throw new HttpError(410, "This upload could not be found. Select the file and upload it again.");
  const blob = downloaded.data;
  try {
    if (blob.size !== upload.size || blob.size > MAX_SYLLABUS_BYTES) throw new HttpError(413, "The uploaded file size does not match. Select the file and try again.");
    form.set("file", new File([blob], upload.path.split("/").at(-1)!));
    return await uploadSyllabus(owner, form, upload.path);
  } catch (error) {
    await db.storage.from("syllabuses").remove([upload.path]);
    throw error;
  }
}
async function inspectDocx(buffer: Buffer) {
  await new Promise<void>((resolve, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) return reject(new HttpError(400, "This DOCX document could not be read."));
      let total = 0; let entries = 0; let hasDocument = false;
      zip.on("error", () => reject(new HttpError(400, "This document is damaged.")));
      zip.on("entry", entry => {
        total += entry.uncompressedSize; entries++;
        if (entry.fileName === "word/document.xml") hasDocument = true;
        if (total > 24 * 1024 * 1024 || entries > 2000 || entry.generalPurposeBitFlag & 1) {
          zip.close(); reject(new HttpError(413, "The document is too large when expanded or is encrypted. Export it as PDF or text.")); return;
        }
        zip.readEntry();
      });
      zip.on("end", () => hasDocument ? resolve() : reject(new HttpError(400, "Please upload a valid DOCX document.")));
      zip.readEntry();
    });
  });
}
export async function uploadSyllabus(actor: CourseOwner, form: FormData, storedPath?: string) {
  const input = form.get("text");
  let text = typeof input === "string" ? input.trim() : "";
  if (text.length > 30000) throw new HttpError(413, "Limit pasted syllabus text to 30,000 characters.");
  const grade = String(form.get("grade") ?? "").trim();
  const subject = String(form.get("subject") ?? "").trim();
  if (grade.length < 1 || grade.length > 60) throw new HttpError(400, "Choose or enter a class for this course.");
  if (subject.length < 1 || subject.length > 80) throw new HttpError(400, "Choose or enter a subject for this course.");
  const file = form.get("file");
  let attachment: { type: "pdf" | "image"; name: string; mime: string; base64: string } | undefined;
  let path: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_SYLLABUS_BYTES) throw new HttpError(413, "Upload a file up to 10 MB.");
    const format = syllabusFormat(file.name);
    if (!format) throw new HttpError(415, "Supported files: PDF, PNG, JPEG, WebP, DOCX and TXT.");
    const { extension: ext, mime } = format;
    const buffer = Buffer.from(await file.arrayBuffer());
    const valid = ext === "pdf" ? buffer.subarray(0, 5).toString() === "%PDF-" :
      ext === "png" ? buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" :
      ["jpg", "jpeg"].includes(ext) ? buffer.subarray(0, 3).toString("hex") === "ffd8ff" :
      ext === "webp" ? buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP" :
      ext === "docx" ? buffer.subarray(0, 2).toString() === "PK" : !buffer.includes(0);
    if (!valid) throw new HttpError(400, "The file contents do not match the selected file type.");
    if (ext === "docx") {
      await inspectDocx(buffer);
      text += `\n${(await mammoth.extractRawText({ buffer })).value}`;
    } else if (ext === "txt") text += `\n${buffer.toString("utf8")}`;
    else attachment = { type: ext === "pdf" ? "pdf" : "image", name: `syllabus.${ext}`, mime, base64: buffer.toString("base64") };
    if (text.length > 50000) throw new HttpError(413, "The extracted document is too long. Upload a syllabus of at most 50,000 characters.");
    path = storedPath ?? `${actor.id}/${randomUUID()}.${ext}`;
    if (!storedPath) unwrap(await admin().storage.from("syllabuses").upload(path, buffer, { contentType: mime, upsert: false }));
  }
  try {
    if (!attachment && !text.trim()) throw new HttpError(400, "Upload a syllabus or enter a topic. One or two words are enough.");
    const draft = await extractSyllabus(text, attachment, { grade, subject });
    const id = unwrap<string>(await admin().rpc("create_course_draft", { p_owner: actor.id, p_kind: actor.role, p_syllabus: draft, p_path: path }));
    return { id };
  } catch (error) {
    if (path && !storedPath) await admin().storage.from("syllabuses").remove([path]);
    throw error;
  }
}
