import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FinishReason } from "@google/genai";
import { createUploadedCourse, prepareSyllabusUpload, uploadSyllabus } from "@/lib/server/uploads";
import { signUploadTicket } from "@/lib/server/upload-tickets";
import type { SyllabusDraft } from "@/lib/learning/schemas";
import { geminiError, geminiResponse } from "./fixtures/gemini";

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(), rpc: vi.fn(), upload: vi.fn(), remove: vi.fn(), download: vi.fn(),
  list: vi.fn(), createSignedUploadUrl: vi.fn(), existing: vi.fn(), referenced: vi.fn(),
}));

vi.mock("@google/genai", async importOriginal => {
  const actual = await importOriginal<typeof import("@google/genai")>();
  return { ...actual, GoogleGenAI: class extends actual.GoogleGenAI {
    constructor(...args: ConstructorParameters<typeof actual.GoogleGenAI>) {
      super(...args);
      this.models.generateContent = mocks.generateContent;
    }
  } };
});
vi.mock("@/lib/supabase/server", () => ({
  admin: () => ({
    rpc: mocks.rpc,
    from: (table: string) => {
      if (table !== "courses") return {};
      const query: Record<string, unknown> = {};
      query.select = () => query;
      query.eq = () => query;
      query.is = () => query;
      query.in = () => query;
      query.limit = () => query;
      query.maybeSingle = mocks.existing;
      query.then = (resolve: (value: unknown) => unknown) => mocks.referenced().then(resolve);
      return query;
    },
    storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove, download: mocks.download, list: mocks.list, createSignedUploadUrl: mocks.createSignedUploadUrl }) },
  }),
}));

const student = { id: "student-id", role: "student" as const };
const teacher = { id: "teacher-id", role: "teacher" as const };
const draft: SyllabusDraft = {
  title: "Light and reflection", subject: "Physics", grade: "Introductory",
  description: "An introductory course on light rays and reflection. No learning level was supplied.",
  concepts: [
    {
      slug: "light-rays", title: "Light rays", summary: "Foundations: representing how light travels.", prerequisites: [],
      content: {
        explanation: "In a uniform transparent medium, light travels in straight lines. A ray represents its direction of travel.",
        examples: [{ problem: "How can you represent the direction in which light travels?", solution: "Draw a straight line with an arrow pointing in the direction of travel." }],
        misconceptions: [], revision_notes: "Use an arrow on each ray to show the direction of travel.",
      },
    },
    {
      slug: "reflection", title: "Reflection", summary: "Apply the law of reflection at a plane mirror.", prerequisites: ["light-rays"],
      content: {
        explanation: "The angle of incidence equals the angle of reflection. Both angles are measured from the normal to the surface.",
        examples: [{ problem: "A ray has an angle of incidence of 30°. What is its angle of reflection?", solution: "The angle of reflection is 30°, measured from the normal." }],
        misconceptions: ["Angles of incidence and reflection are measured from the normal, not the mirror surface."],
        revision_notes: "Draw the normal perpendicular to the surface and measure both angles from it.",
      },
    },
  ],
};

function form(text: string, file?: File) {
  const data = new FormData();
  data.set("text", text);
  data.set("grade", "Class 10");
  data.set("subject", "Physics");
  if (file) data.set("file", file);
  return data;
}

function reviewedDraft() {
  mocks.generateContent.mockResolvedValueOnce(geminiResponse(draft));
  mocks.generateContent.mockResolvedValueOnce(geminiResponse({ valid: true, reason: "Accurate and within scope." }));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "test-key-never-sent");
  vi.stubEnv("GEMINI_MODEL", "gemini-3.8-flash");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.rpc.mockResolvedValue({ data: "course-id", error: null });
  mocks.upload.mockResolvedValue({ data: { path: "uploaded" }, error: null });
  mocks.remove.mockResolvedValue({ data: [], error: null });
  mocks.list.mockResolvedValue({ data: [], error: null });
  mocks.createSignedUploadUrl.mockResolvedValue({ data: { token: "signed-token" }, error: null });
  mocks.existing.mockResolvedValue({ data: null, error: null });
  mocks.referenced.mockResolvedValue({ data: [], error: null });
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("Gemini syllabus uploads", () => {
  it.each([
    ["one-word topic", "Physics"],
    ["two-word topic", "Linear algebra"],
    ["single-letter topic", "C"],
    ["padded topic", "  Physics  "],
    ["chapter description", "Chapter 10: Light – Reflection and Refraction: Covers reflection and refraction through spherical mirrors and lenses, mirror/lens formulas, magnification, and refractive index."],
  ])("accepts a %s and saves only the reviewed draft", async (_, text) => {
    reviewedDraft();
    await expect(uploadSyllabus(student, form(text))).resolves.toEqual({ id: "course-id" });
    expect(mocks.generateContent).toHaveBeenCalledTimes(2);
    expect(mocks.rpc).toHaveBeenCalledWith("create_course_draft", { p_owner: "student-id", p_kind: "student", p_syllabus: { ...draft, grade: "Class 10", subject: "Physics" }, p_path: null });
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("creates a teacher-owned draft with the selected class and subject", async () => {
    reviewedDraft();
    await expect(uploadSyllabus(teacher, form("Physics"))).resolves.toEqual({ id: "course-id" });
    expect(mocks.rpc).toHaveBeenCalledWith("create_course_draft", { p_owner: "teacher-id", p_kind: "teacher", p_syllabus: { ...draft, grade: "Class 10", subject: "Physics" }, p_path: null });
  });

  it.each([
    ["pdf", "application/pdf", Buffer.from("%PDF-1.7\nTest document")],
    ["png", "image/png", Buffer.from("89504e470d0a1a0a", "hex")],
    ["jpg", "image/jpeg", Buffer.from("ffd8ff", "hex")],
    ["webp", "image/webp", Buffer.from("RIFF0000WEBP")],
  ])("sends %s bytes and MIME type to Gemini for extraction and review", async (extension, mime, bytes) => {
    reviewedDraft();
    await expect(uploadSyllabus(student, form("", new File([bytes], `syllabus.${extension}`, { type: mime })))).resolves.toEqual({ id: "course-id" });
    for (const [request] of mocks.generateContent.mock.calls) {
      expect(request.contents[0].parts).toContainEqual({ inlineData: { mimeType: mime, data: bytes.toString("base64") } });
    }
    expect(mocks.rpc).toHaveBeenCalledWith("create_course_draft", expect.objectContaining({ p_kind: "student", p_path: mocks.upload.mock.calls[0][0] }));
  });

  it("sends a text document as text rather than an unsupported binary attachment", async () => {
    reviewedDraft();
    await uploadSyllabus(student, form("", new File(["Physics"], "topic.txt", { type: "text/plain" })));
    expect(mocks.generateContent.mock.calls[0][0].contents[0].parts).toEqual([{ text: expect.stringContaining("Physics") }]);
  });

  it.each(["", " \n\t "])("rejects blank input before contacting Gemini", async text => {
    await expect(uploadSyllabus(student, form(text))).rejects.toMatchObject({ status: 400 });
    expect(mocks.generateContent).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("keeps the upper text-size limit", async () => {
    await expect(uploadSyllabus(student, form("a".repeat(30001)))).rejects.toMatchObject({ status: 413 });
    expect(mocks.generateContent).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not save a draft that fails independent review", async () => {
    mocks.generateContent.mockResolvedValueOnce(geminiResponse(draft));
    mocks.generateContent.mockResolvedValueOnce(geminiResponse({ valid: false, reason: "Outside the requested scope." }));
    await expect(uploadSyllabus(student, form("Physics"))).rejects.toMatchObject({ status: 422 });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not save a syllabus with cyclic prerequisites", async () => {
    const cyclic = structuredClone(draft);
    cyclic.concepts[0].prerequisites = ["reflection"];
    mocks.generateContent.mockResolvedValueOnce(geminiResponse(cyclic));
    await expect(uploadSyllabus(student, form("Physics"))).rejects.toMatchObject({ status: 422 });
    expect(mocks.generateContent).toHaveBeenCalledOnce();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    geminiResponse(draft, FinishReason.MAX_TOKENS),
    geminiResponse({ title: "Invalid syllabus" }),
  ])("does not save incomplete or invalid Gemini output", async result => {
    mocks.generateContent.mockResolvedValueOnce(result);
    await expect(uploadSyllabus(student, form("Physics"))).rejects.toMatchObject({ status: 503 });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

describe("direct-to-storage syllabus uploads", () => {
  const ownerId = "6f1c2f6e-7a2b-4c3d-8e4f-5a6b7c8d9e0f";
  const owner = { id: ownerId, role: "student" as const };
  const path = `${ownerId}/0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b.pdf`;
  const input = { grade: "Class 10", subject: "Physics", text: "" };

  it("issues a signed upload for a supported file", async () => {
    await expect(prepareSyllabusUpload(owner, "Syllabus.PDF", 2048)).resolves.toEqual({
      path: expect.stringMatching(new RegExp(`^${ownerId}/[a-f0-9-]+\\.pdf$`)),
      token: "signed-token",
      ticket: expect.any(String),
      contentType: "application/pdf",
    });
    expect(mocks.createSignedUploadUrl).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^${ownerId}/[a-f0-9-]+\\.pdf$`)), { upsert: false });
  });

  it.each([
    ["unsupported format", "syllabus.zip", 2048],
    ["oversized file", "syllabus.pdf", 10 * 1024 * 1024 + 1],
    ["empty file", "syllabus.pdf", 0],
  ])("rejects an %s", async (_, name, size) => {
    await expect(prepareSyllabusUpload(owner, name, size)).rejects.toMatchObject({ status: expect.any(Number) });
    expect(mocks.createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it("processes a file uploaded directly to private storage without uploading it again", async () => {
    reviewedDraft();
    const blob = new Blob(["%PDF-1.7\nTest document"]);
    mocks.download.mockResolvedValue({ data: blob, error: null });
    const ticket = signUploadTicket(ownerId, path, blob.size);
    await expect(createUploadedCourse(owner, { ...input, ticket })).resolves.toEqual({ id: "course-id" });
    expect(mocks.download).toHaveBeenCalledWith(path);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledWith("create_course_draft", expect.objectContaining({ p_owner: ownerId, p_kind: "student", p_path: path }));
  });

  it("returns the saved course when a retry arrives after a lost response", async () => {
    mocks.existing.mockResolvedValue({ data: { id: "course-id" }, error: null });
    const ticket = signUploadTicket(ownerId, path, 22);
    await expect(createUploadedCourse(owner, { ...input, ticket })).resolves.toEqual({ id: "course-id" });
    expect(mocks.download).not.toHaveBeenCalled();
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });

  it("rejects a ticket whose payload was altered", async () => {
    const ticket = signUploadTicket(ownerId, path, 22);
    const [payload, mac] = ticket.split(".");
    const altered = `${payload.slice(0, -1)}${payload.endsWith("A") ? "B" : "A"}.${mac}`;
    await expect(createUploadedCourse(owner, { ...input, ticket: altered })).rejects.toMatchObject({ status: 400 });
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it("rejects an expired ticket", async () => {
    const ticket = signUploadTicket(ownerId, path, 22, Date.now() - 3 * 3600000);
    await expect(createUploadedCourse(owner, { ...input, ticket })).rejects.toMatchObject({ status: 410 });
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it("deletes a stored file whose size does not match the ticket", async () => {
    mocks.download.mockResolvedValue({ data: new Blob(["%PDF-1.7\nTest document"]), error: null });
    const ticket = signUploadTicket(ownerId, path, 999);
    await expect(createUploadedCourse(owner, { ...input, ticket })).rejects.toMatchObject({ status: 413 });
    expect(mocks.remove).toHaveBeenCalledWith([path]);
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });

  it("reports a missing stored file with a re-upload message", async () => {
    mocks.download.mockResolvedValue({ data: null, error: { message: "Object not found" } });
    const ticket = signUploadTicket(ownerId, path, 22);
    await expect(createUploadedCourse(owner, { ...input, ticket })).rejects.toMatchObject({ status: 410, message: expect.stringMatching(/upload it again/) });
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });
});

describe("provider failures preserve uploaded-course state", () => {
  it.each([
    [geminiError(403, "The Gemini API free tier is not available for this project. Please set up billing."), /billing is required/],
    [geminiError(429, "Quota exceeded", "RESOURCE_EXHAUSTED"), /quota or rate limit/],
    [geminiError(400, "API key not valid", "INVALID_ARGUMENT"), /Update GEMINI_API_KEY/],
    [geminiError(404, "Model not found", "NOT_FOUND"), /GEMINI_MODEL is unavailable/],
    [new DOMException("Request timed out", "TimeoutError"), /took too long/],
    [new TypeError("fetch failed"), /could not connect/],
  ])("returns an actionable error without creating a course", async (error, message) => {
    mocks.generateContent.mockRejectedValueOnce(error);
    await expect(uploadSyllabus(student, form("Physics"))).rejects.toMatchObject({ status: 503, message: expect.stringMatching(message) });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects a missing API key before making a provider request", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(uploadSyllabus(student, form("Physics"))).rejects.toMatchObject({ status: 503, message: expect.stringContaining("GEMINI_API_KEY") });
    expect(mocks.generateContent).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("cleans up an uploaded file when the provider fails", async () => {
    mocks.generateContent.mockRejectedValueOnce(geminiError(429, "Quota exceeded", "RESOURCE_EXHAUSTED"));
    await expect(uploadSyllabus(student, form("", new File(["Physics"], "topic.txt", { type: "text/plain" })))).rejects.toMatchObject({ status: 503 });
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("cleans up a whitespace-only text upload rejected as empty", async () => {
    await expect(uploadSyllabus(student, form("", new File([" \n "], "empty.txt", { type: "text/plain" })))).rejects.toMatchObject({ status: 400 });
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
    expect(mocks.generateContent).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
