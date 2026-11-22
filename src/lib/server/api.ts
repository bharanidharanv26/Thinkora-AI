import "server-only";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { admin } from "@/lib/supabase/server";
import { identity, profileFor, requireProfile } from "./auth";
import { boundedBody, HttpError, idSchema, jsonBody, rateLimit, unwrap } from "./http";
import { LEGACY_DELETED_PREFIX, loadState, ownedEnrollment, readableCourse } from "./data";
import { prepareStep, submitAnswer } from "./learning";
import { answerSchema } from "@/lib/learning/schemas";
import { createUploadedCourse, prepareSyllabusUpload, uploadSyllabus } from "./uploads";
import { inviteStudent, studentConnectionAction, studentConnectsTeacher, teacherConnectionAction } from "./monitoring";
import type { Course } from "@/lib/types";
import { teacherCodeFor } from "@/lib/teacher-code";

async function deleteOwnedCourse(course: Course, actorId: string) {
  const db = admin();
  const deleted = await db.rpc("delete_course", { p_course: course.id, p_actor: actorId });
  if (deleted.error) {
    // Older hosted databases predate migration 007. Keep the course row and
    // learning records, but mark it hidden until the soft-delete column exists.
    if (deleted.error.code !== "PGRST202" && deleted.error.code !== "42883") unwrap(deleted);
    const marked = unwrap<{ id: string }[]>(await db.from("courses").update({ source_path: `${LEGACY_DELETED_PREFIX}${course.id}:${Date.now()}` }).eq("id", course.id).eq("owner_id", actorId).select("id"));
    if (!marked.length) throw new HttpError(404, "Course not found.");
  }
  if (course.source_path) await db.storage.from("syllabuses").remove([course.source_path]);
}

const registration = z.discriminatedUnion("role", [
  z.object({ role: z.literal("student"), display_name: z.string().trim().min(2).max(100), age_band: z.enum(["under18", "adult"]), grade: z.string().trim().min(1).max(60) }),
  z.object({ role: z.literal("teacher"), display_name: z.string().trim().min(2).max(100), institution: z.string().trim().min(2).max(150) }),
]);

export async function handleGet(request: NextRequest) {
  const path = request.nextUrl.pathname.split("/").filter(Boolean).slice(1);
  if (path[0] === "learning" && path.length === 2) {
    const student = await requireProfile("student");
    return loadState(await ownedEnrollment(idSchema.parse(path[1]), student.id));
  }
  throw new HttpError(404, "Endpoint not found.");
}

export async function handlePost(request: NextRequest) {
  const path = request.nextUrl.pathname.split("/").filter(Boolean).slice(1);
  if (path[0] === "register" && path.length === 1) {
    const user = await identity();
    await rateLimit(user.id, "registration", 8);
    if (await profileFor(user.id)) throw new HttpError(409, "Your profile already exists.");
    const input = await jsonBody(request, registration);
    for (let i = 0; i < 3; i++) {
      const payload: Record<string, unknown> = input.role === "student" ? {
        id: user.id, role: input.role, display_name: input.display_name, grade: input.grade, age_band: input.age_band,
        student_code: `TH-${randomBytes(5).toString("hex").toUpperCase()}`,
      } : { id: user.id, ...input, teacher_code: teacherCodeFor(user.id) };
      let result = await admin().from("profiles").insert(payload);
      const missingTeacherCode = input.role === "teacher" && (result.error?.code === "42703" || result.error?.code === "PGRST204") && /teacher_code/.test(result.error.message);
      if (missingTeacherCode) {
        // Hosted databases created before migration 005 have no teacher_code.
        // Let the teacher finish registration; Teacher ID features need the migration.
        delete payload.teacher_code;
        result = await admin().from("profiles").insert(payload);
      }
      if (!result.error) return { redirect: input.role === "teacher" ? "/teacher" : "/dashboard" };
      if (result.error.code !== "23505" || i === 2) unwrap(result);
    }
  }
  if (path[0] === "guardian" && path[1] === "consent" && path.length === 2) {
    throw new HttpError(410, "Connections are now accepted directly by the student or teacher. This email link is no longer needed.");
  }
  if (path[0] === "courses" && path[1] === "upload" && path.length === 2) {
    const owner = await requireProfile();
    await rateLimit(owner.id, "syllabus-upload", 5);
    if (request.headers.get("content-type")?.includes("application/json")) {
      const bytes = await boundedBody(request, 160000);
      let payload: unknown;
      try { payload = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HttpError(400, "Invalid JSON request."); }
      const input = z.object({ grade: z.string().trim().min(1).max(60), subject: z.string().trim().min(1).max(80), text: z.string().max(30000).default(""), ticket: z.string().max(2048).optional() }).parse(payload);
      return createUploadedCourse(owner, input);
    }
    // Compatibility for a page opened before direct-to-storage uploads shipped.
    const bytes = await boundedBody(request, 4 * 1024 * 1024);
    const boundedRequest = new Request(request.url, { method: "POST", headers: { "Content-Type": request.headers.get("content-type") ?? "" }, body: bytes });
    let form;
    try { form = await boundedRequest.formData(); } catch { throw new HttpError(400, "Upload a valid multipart form."); }
    return uploadSyllabus(owner, form);
  }
  if (path[0] === "courses" && path[1] === "upload-url" && path.length === 2) {
    const owner = await requireProfile();
    await rateLimit(owner.id, "syllabus-upload-url", 10);
    const input = await jsonBody(request, z.object({ name: z.string().min(1).max(255), size: z.number().int().positive() }));
    return prepareSyllabusUpload(owner, input.name, input.size);
  }
  if (path[0] === "courses" && path[2] === "approve" && path.length === 3) {
    const student = await requireProfile("student");
    const { course } = await readableCourse(idSchema.parse(path[1]), student);
    if (course.course_kind !== "student" || course.owner_id !== student.id || course.status === "published") throw new HttpError(400, "Only your draft syllabus can be approved.");
    if (course.status === "approved") return { id: course.id };
    unwrap(await admin().from("courses").update({ status: "approved" }).eq("id", course.id).eq("owner_id", student.id).eq("course_kind", "student").eq("status", "draft"));
    return { id: course.id };
  }
  if (path[0] === "courses" && path[2] === "publish" && path.length === 3) {
    const teacher = await requireProfile("teacher");
    const { course } = await readableCourse(idSchema.parse(path[1]), teacher);
    if (course.course_kind !== "teacher" || course.owner_id !== teacher.id) throw new HttpError(403, "You can only publish courses you created.");
    unwrap<string>(await admin().rpc("publish_course", { p_course: course.id, p_actor: teacher.id }));
    return { id: course.id };
  }
  if (path[0] === "courses" && path[2] === "discard" && path.length === 3) {
    const student = await requireProfile("student");
    const { course } = await readableCourse(idSchema.parse(path[1]), student);
    if (course.course_kind !== "student" || course.owner_id !== student.id || course.status !== "draft") throw new HttpError(400, "Only your draft syllabus can be discarded.");
    await deleteOwnedCourse(course, student.id);
    return { ok: true };
  }
  if (path[0] === "courses" && path[2] === "delete" && path.length === 3) {
    const owner = await requireProfile();
    const { course } = await readableCourse(idSchema.parse(path[1]), owner);
    if (course.owner_id !== owner.id || course.course_kind !== owner.role) throw new HttpError(403, "You can only delete your own custom courses.");
    await deleteOwnedCourse(course, owner.id);
    return { ok: true };
  }
  if (path[0] === "enroll" && path.length === 1) {
    const student = await requireProfile("student");
    const input = await jsonBody(request, z.object({ course_id: z.uuid(), mode: z.enum(["scratch", "prior"]) }));
    const { course } = await readableCourse(input.course_id, student);
    if (course.status === "draft") throw new HttpError(400, "Review and approve your syllabus before starting.");
    const id = unwrap<string>(await admin().rpc("enroll_course", { p_student: student.id, p_course: course.id, p_mode: input.mode }));
    return { id };
  }
  if (path[0] === "learning" && path.length === 3) {
    const student = await requireProfile("student");
    const id = idSchema.parse(path[1]);
    await ownedEnrollment(id, student.id);
    if (path[2] === "draft") {
      const input = await jsonBody(request, z.object({ question_id: z.uuid(), answer: z.string().max(3000), reasoning: z.string().max(4000), dont_know: z.boolean() }));
      const result = unwrap<{ id: string }[]>(await admin().from("learning_sessions").update({ answer_draft: { answer: input.answer, reasoning: input.reasoning, dont_know: input.dont_know } }).eq("enrollment_id", id).eq("current_question_id", input.question_id).is("last_attempt_id", null).is("operation_token", null).select("id"));
      if (!result.length) throw new HttpError(409, "The question changed. Reload before continuing.");
      return { saved: true };
    }
    if (path[2] === "next") {
      const input = await jsonBody(request, z.object({ revision_concept: z.uuid().optional() }));
      await rateLimit(student.id, "ai-learning", 100);
      return prepareStep(student.id, id, input.revision_concept);
    }
    if (path[2] === "answer") {
      const input = await jsonBody(request, answerSchema);
      await rateLimit(student.id, "ai-evaluation", 100);
      return submitAnswer(student.id, id, input);
    }
    if (path[2] === "mode") {
      const input = await jsonBody(request, z.object({ mode: z.enum(["scratch", "prior"]) }));
      const changed = unwrap<boolean>(await admin().rpc("set_learning_mode", { p_enrollment: id, p_mode: input.mode }));
      if (!changed) throw new HttpError(409, "A learning step is being prepared. Wait a moment before switching modes.");
      return { mode: input.mode };
    }
  }
  if (path[0] === "classes" && path.length === 1) {
    const teacher = await requireProfile("teacher");
    await rateLimit(teacher.id, "create-class", 20);
    const input = await jsonBody(request, z.object({ name: z.string().trim().min(2).max(100), subject: z.string().trim().min(2).max(100) }));
    return unwrap(await admin().from("classes").insert({ teacher_id: teacher.id, ...input }).select("id").single());
  }
  if (path[0] === "invite" && path.length === 1) {
    const teacher = await requireProfile("teacher");
    await rateLimit(teacher.id, "student-invite", 12);
    const input = await jsonBody(request, z.object({ student_code: z.string().trim().toUpperCase().regex(/^TH-[A-F0-9]{10}$/, "Use a Student ID like TH-1234AB5678.") }));
    return inviteStudent(teacher, input.student_code);
  }
  if (path[0] === "connect" && path.length === 1) {
    const student = await requireProfile("student");
    await rateLimit(student.id, "teacher-connect", 12);
    const input = await jsonBody(request, z.object({ teacher_code: z.string().trim().toUpperCase().regex(/^THT-[A-F0-9]{10}$/, "Use a Teacher ID like THT-1234AB5678.") }));
    return studentConnectsTeacher(student, input.teacher_code);
  }
  if (path[0] === "teacher-connections" && path.length === 2) {
    const teacher = await requireProfile("teacher");
    const input = await jsonBody(request, z.object({ action: z.enum(["accept", "reject"]) }));
    await rateLimit(teacher.id, "teacher-connection-action", 15);
    return teacherConnectionAction(teacher, idSchema.parse(path[1]), input.action);
  }
  if (path[0] === "connections" && path.length === 2) {
    const student = await requireProfile("student");
    const input = await jsonBody(request, z.object({ action: z.enum(["accept", "approve", "reject", "revoke"]) }));
    await rateLimit(student.id, "connection-action", 15);
    return studentConnectionAction(student, idSchema.parse(path[1]), input.action);
  }
  throw new HttpError(404, "Endpoint not found.");
}
