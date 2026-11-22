import "server-only";
import { admin } from "@/lib/supabase/server";
import type { Attempt, Concept, Course, CourseKind, CourseState, Diagnostic, Enrollment, LearningSession, Mastery, Misconception, Prerequisite, Profile, PublicQuestion, Question, Revision } from "@/lib/types";
import { HttpError, unwrap } from "./http";
import { monitoringAllowed } from "./monitoring";

type CourseActor = Pick<Profile, "id" | "role">;
type StoredCourse = Course & { course_kind?: CourseKind | null; deleted_at?: string | null };
export const LEGACY_DELETED_PREFIX = "deleted:";

export function isCourseHidden(course: { deleted_at?: string | null; source_path?: string | null }) {
  return !!course.deleted_at || !!course.source_path?.startsWith(LEGACY_DELETED_PREFIX);
}

function legacyKind(course: StoredCourse, actor: CourseActor): CourseKind {
  if (!course.owner_id) return "predefined";
  if (course.owner_id === actor.id) return actor.role;
  return actor.role === "student" ? "teacher" : "student";
}

export function normalizeCourse(course: Course, actor: CourseActor): Course {
  const stored = course as StoredCourse;
  return { ...course, course_kind: stored.course_kind ?? legacyKind(stored, actor), deleted_at: stored.deleted_at ?? null };
}

export async function ownedEnrollment(id: string, studentId: string): Promise<Enrollment> {
  const db = admin();
  const e = unwrap<Enrollment | null>(await db.from("enrollments").select("*").eq("id", id).eq("student_id", studentId).maybeSingle());
  if (!e) throw new HttpError(404, "Learning course not found.");
  const course = unwrap<StoredCourse | null>(await db.from("courses").select("*").eq("id", e.course_id).maybeSingle());
  const available = !!course && !isCourseHidden(course) && (
    !course.course_kind
      ? course.status === "published" || course.owner_id === studentId
      : (course.course_kind === "predefined" && course.status === "published") ||
        (course.course_kind === "student" && course.owner_id === studentId) ||
        (course.course_kind === "teacher" && course.status === "published" && !!course.owner_id && await studentConnectedToTeacher(studentId, course.owner_id))
  );
  if (!available) throw new HttpError(404, "Learning course not found.");
  return e;
}
export async function studentConnectedToTeacher(studentId: string, teacherId: string) {
  const db = admin();
  const requests = unwrap<{ status: string; student_approved_at: string | null }[]>(await db.from("monitoring_requests")
    .select("status,student_approved_at").eq("student_id", studentId).eq("teacher_id", teacherId).eq("status", "approved"));
  return requests.some(monitoringAllowed);
}
export async function courseContent(id: string) {
  const db = admin();
  const [course, concepts, prerequisites] = await Promise.all([
    db.from("courses").select("*").eq("id", id).maybeSingle(),
    db.from("concepts").select("*").eq("course_id", id).order("order_index"),
    db.from("prerequisites").select("concept_id, prerequisite_id").eq("course_id", id),
  ]);
  const data = unwrap<Course | null>(course) as StoredCourse | null;
  if (!data || isCourseHidden(data)) throw new HttpError(404, "Course not found.");
  return { course: data as Course, concepts: unwrap<Concept[]>(concepts), prerequisites: unwrap<Prerequisite[]>(prerequisites) };
}
export async function readableCourse(id: string, actor: CourseActor) {
  const data = await courseContent(id);
  const course = data.course as StoredCourse;
  if (!course.course_kind) {
    if (course.status !== "published" && course.owner_id !== actor.id) throw new HttpError(404, "Course not found.");
    return { ...data, course: normalizeCourse(course, actor) };
  }
  let available = false;
  if (actor.role === "teacher") available = course.course_kind === "teacher" && course.owner_id === actor.id;
  else if (course.course_kind === "predefined") available = course.status === "published";
  else if (course.course_kind === "student") available = course.owner_id === actor.id;
  else if (course.course_kind === "teacher") available = course.status === "published" && !!course.owner_id && await studentConnectedToTeacher(actor.id, course.owner_id);
  if (!available) throw new HttpError(404, "Course not found.");
  return { ...data, course: normalizeCourse(course, actor) };
}
export async function loadState(enrollment: Enrollment): Promise<CourseState> {
  const db = admin();
  const [content, sessionResult, mastery, misconceptions, revisions, attempts, diagnostic] = await Promise.all([
    courseContent(enrollment.course_id),
    db.from("learning_sessions").select("id,enrollment_id,current_question_id,current_lesson,answer_draft,next_action,last_attempt_id,revision_concept_id,version,updated_at").eq("enrollment_id", enrollment.id).single(),
    db.from("concept_mastery").select("*").eq("enrollment_id", enrollment.id),
    db.from("misconceptions").select("*").eq("enrollment_id", enrollment.id),
    db.from("revision_schedules").select("*").eq("enrollment_id", enrollment.id).order("due_at"),
    db.from("attempts").select("*,question:questions(prompt,difficulty,kind)").eq("enrollment_id", enrollment.id).order("created_at", { ascending: false }).limit(150),
    db.from("diagnostics").select("*").eq("enrollment_id", enrollment.id).single(),
  ]);
  const session = unwrap<LearningSession>(sessionResult);
  const history = unwrap<Attempt[]>(attempts).reverse();
  let question: PublicQuestion | null = null;
  if (session.current_question_id) question = unwrap<PublicQuestion>(await db.from("questions").select("id,concept_id,kind,difficulty,prompt,options").eq("id", session.current_question_id).single());
  return { ...content, enrollment, session, mastery: unwrap<Mastery[]>(mastery), misconceptions: unwrap<Misconception[]>(misconceptions), revisions: unwrap<Revision[]>(revisions), attempts: history, diagnostic: unwrap<Diagnostic>(diagnostic), question, feedback: history.find(a => a.id === session.last_attempt_id) ?? null };
}
export async function privateQuestion(id: string, enrollment: string) {
  return unwrap<Question>(await admin().from("questions").select("*").eq("id", id).eq("enrollment_id", enrollment).single());
}
