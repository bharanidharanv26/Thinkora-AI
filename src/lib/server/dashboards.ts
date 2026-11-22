import "server-only";
import { admin } from "@/lib/supabase/server";
import type { Attempt, Classroom, Concept, Connection, Course, Enrollment, Mastery, Misconception, Profile, Revision } from "@/lib/types";
import { HttpError, unwrap } from "./http";
import { canAdvance } from "@/lib/learning/engine";
import { connectionForUi, monitoringAllowed } from "./monitoring";
import { isCourseHidden, normalizeCourse } from "./data";

export async function studentData(studentId: string) {
  const db = admin();
  const [coursesResult, enrollmentsResult, requestsResult] = await Promise.all([
    db.from("courses").select("*").or(`status.eq.published,owner_id.eq.${studentId}`).order("created_at"),
    db.from("enrollments").select("*").eq("student_id", studentId).order("updated_at", { ascending: false }),
    db.from("monitoring_requests").select("*").eq("student_id", studentId).order("created_at", { ascending: false }),
  ]);
  const requests = unwrap<Connection[]>(requestsResult);
  const visibleRequests = requests.map(connectionForUi);
  const connectedTeachers = new Set(requests.filter(monitoringAllowed).map(r => r.teacher_id));
  const courses = unwrap<Course[]>(coursesResult).filter(course => {
    if (isCourseHidden(course)) return false;
    if (!course.course_kind) return course.status === "published" || course.owner_id === studentId;
    return (course.course_kind === "predefined" && course.status === "published") ||
      (course.course_kind === "student" && course.owner_id === studentId) ||
      (course.course_kind === "teacher" && course.status === "published" && !!course.owner_id && connectedTeachers.has(course.owner_id));
  }).map(course => normalizeCourse(course, { id: studentId, role: "student" }));
  const visibleCourseIds = new Set(courses.map(c => c.id));
  const enrollments = unwrap<Enrollment[]>(enrollmentsResult).filter(e => visibleCourseIds.has(e.course_id));
  const ids = enrollments.map(e => e.id);
  const courseIds = courses.map(c => c.id);
  const [concepts, mastery, misconceptions, revisions, attempts] = await Promise.all([
    courseIds.length ? db.from("concepts").select("*").in("course_id", courseIds).order("order_index") : { data: [], error: null },
    ids.length ? db.from("concept_mastery").select("*").in("enrollment_id", ids) : { data: [], error: null },
    ids.length ? db.from("misconceptions").select("*").in("enrollment_id", ids) : { data: [], error: null },
    ids.length ? db.from("revision_schedules").select("*").in("enrollment_id", ids).order("due_at") : { data: [], error: null },
    ids.length ? db.from("attempts").select("*,question:questions(prompt,difficulty,kind)").in("enrollment_id", ids).order("created_at", { ascending: false }).limit(30) : { data: [], error: null },
  ]);
  const connections = await Promise.all(visibleRequests.map(async r => {
    const [t, c] = await Promise.all([db.from("profiles").select("display_name").eq("id", r.teacher_id).single(), db.from("classes").select("name").eq("id", r.class_id).single()]);
    return { ...r, teacher_name: unwrap<{ display_name: string }>(t).display_name, class_name: unwrap<{ name: string }>(c).name };
  }));
  return { courses, enrollments, concepts: unwrap<Concept[]>(concepts), mastery: unwrap<Mastery[]>(mastery), misconceptions: unwrap<Misconception[]>(misconceptions), revisions: unwrap<Revision[]>(revisions), attempts: unwrap<Attempt[]>(attempts).reverse(), connections };
}
export type StudentData = Awaited<ReturnType<typeof studentData>>;

export async function teacherCourses(teacherId: string) {
  const db = admin();
  const courses = unwrap<Course[]>(await db.from("courses").select("*").eq("owner_id", teacherId).order("created_at", { ascending: false }))
    .filter(course => !isCourseHidden(course) && (course.course_kind ?? "teacher") === "teacher")
    .map(course => normalizeCourse(course, { id: teacherId, role: "teacher" }));
  const concepts = courses.length
    ? unwrap<Concept[]>(await db.from("concepts").select("*").in("course_id", courses.map(c => c.id)).order("order_index"))
    : [];
  return { courses, concepts, enrollments: [] as Enrollment[] };
}
export type TeacherCourses = Awaited<ReturnType<typeof teacherCourses>>;

export async function authorizedStudent(teacherId: string, studentId: string) {
  const db = admin();
  const student = unwrap<Profile | null>(await db.from("profiles").select("*").eq("id", studentId).eq("role", "student").maybeSingle());
  if (!student) throw new HttpError(404, "Student not available.");
  const requests = unwrap<{ status: string; student_approved_at: string | null }[]>(await db.from("monitoring_requests").select("status,student_approved_at").eq("teacher_id", teacherId).eq("student_id", studentId).eq("status", "approved"));
  if (!requests.some(monitoringAllowed)) throw new HttpError(403, "The connection has not been accepted, or access has been revoked.");
  return { id: student.id, display_name: student.display_name, student_code: student.student_code, grade: student.grade };
}

export async function studentLearningRecords(studentId: string, teacherId: string) {
  const db = admin();
  const allEnrollments = unwrap<Enrollment[]>(await db.from("enrollments").select("*").eq("student_id", studentId));
  const enrolledCourseIds = allEnrollments.map(e => e.course_id);
  // Teacher-created courses are visible only to their owner, and private student
  // courses are never exposed through monitoring.
  const allCourses = enrolledCourseIds.length
    ? unwrap<Course[]>(await db.from("courses").select("*").in("id", enrolledCourseIds))
    : [];
  const courses = allCourses.filter(c => !isCourseHidden(c) && (
    (!c.course_kind ? !c.owner_id || c.owner_id === teacherId : c.course_kind === "predefined") ||
    (c.course_kind === "teacher" && c.owner_id === teacherId)
  )).map(c => normalizeCourse(c, { id: teacherId, role: "teacher" }));
  const accessibleIds = new Set(courses.map(c => c.id));
  const enrollments = allEnrollments.filter(e => accessibleIds.has(e.course_id));
  const ids = enrollments.map(e => e.id);
  if (!ids.length) return { enrollments, courses: [] as Pick<Course, "id" | "title" | "subject" | "grade">[], concepts: [] as Concept[], mastery: [] as Mastery[], misconceptions: [] as Misconception[], revisions: [] as Revision[], attempts: [] as Attempt[] };
  const courseIds = [...accessibleIds];
  const [concepts, mastery, misconceptions, revisions, attempts] = await Promise.all([
    db.from("concepts").select("*").in("course_id", courseIds).order("order_index"),
    db.from("concept_mastery").select("*").in("enrollment_id", ids),
    db.from("misconceptions").select("*").in("enrollment_id", ids),
    db.from("revision_schedules").select("*").in("enrollment_id", ids).order("due_at"),
    db.from("attempts").select("*,question:questions(prompt,difficulty,kind)").in("enrollment_id", ids).order("created_at", { ascending: false }).limit(30),
  ]);
  return { enrollments, courses, concepts: unwrap<Concept[]>(concepts), mastery: unwrap<Mastery[]>(mastery), misconceptions: unwrap<Misconception[]>(misconceptions), revisions: unwrap<Revision[]>(revisions), attempts: unwrap<Attempt[]>(attempts).reverse() };
}

export async function teacherData(teacherId: string) {
  const db = admin();
  const [classResult, requestResult] = await Promise.all([
    db.from("classes").select("*").eq("teacher_id", teacherId).order("created_at", { ascending: false }),
    db.from("monitoring_requests").select("*").eq("teacher_id", teacherId).order("created_at", { ascending: false }),
  ]);
  const classes = unwrap<Classroom[]>(classResult);
  const requests = unwrap<Connection[]>(requestResult);
  const visibleRequests = requests.map(connectionForUi);
  const requestIds = [...new Set(requests.map(r => r.student_id))];
  const requestProfiles = requestIds.length ? unwrap<Pick<Profile, "id" | "display_name" | "student_code">[]>(await db.from("profiles").select("id,display_name,student_code").in("id", requestIds)) : [];
  const approvedIds = [...new Set(requests.filter(monitoringAllowed).map(r => r.student_id))];
  const students = await Promise.all(approvedIds.map(async id => {
    const profile = await authorizedStudent(teacherId, id);
    const records = await studentLearningRecords(id, teacherId);
    const total = records.concepts.length;
    const mastered = records.mastery.filter(m => canAdvance(m, records.misconceptions)).length;
    return { ...profile, records, progress: total ? mastered / total : 0, average: records.mastery.length ? records.mastery.reduce((s, m) => s + m.score, 0) / records.mastery.length : 0 };
  }));
  return { classes, requests: visibleRequests.map(r => ({ ...r, student_name: requestProfiles.find(p => p.id === r.student_id)?.display_name ?? "Student", student_code: requestProfiles.find(p => p.id === r.student_id)?.student_code ?? undefined })), students };
}
export type TeacherData = Awaited<ReturnType<typeof teacherData>>;
