import "server-only";
import { admin } from "@/lib/supabase/server";
import type { Classroom, Connection, Profile } from "@/lib/types";
import { HttpError, unwrap } from "./http";
import { teacherCodeFor } from "@/lib/teacher-code";

export function monitoringAllowed(request: { status: string; student_approved_at: string | null }) {
  return request.status === "approved" && !!request.student_approved_at;
}

/** Before migration 005, a student-initiated request is stored as pending_student with the student's approval already recorded. */
export function connectionForUi<T extends { status: string; student_approved_at?: string | null; initiated_by?: string }>(connection: T): T {
  return connection.status === "pending_student" && !!connection.student_approved_at && connection.initiated_by !== "teacher"
    ? { ...connection, status: "pending_teacher" } : connection;
}

/** Classes remain the storage unit for a connection, but the simplified UI uses one default class. */
export async function defaultClass(teacherId: string) {
  const db = admin();
  const existing = unwrap<Classroom[]>(await db.from("classes").select("*").eq("teacher_id", teacherId).order("created_at").limit(1));
  if (existing[0]) return existing[0];
  return unwrap<Classroom>(await db.from("classes").insert({ teacher_id: teacherId, name: "My students", subject: "Physics" }).select("*").single());
}

async function saveConnectionRequest(classroom: Classroom, studentId: string, initiatedBy: "teacher" | "student") {
  const db = admin();
  const find = async () => unwrap<Connection | null>(await db.from("monitoring_requests").select("*").eq("class_id", classroom.id).eq("student_id", studentId).maybeSingle());
  const existing = await find();
  if (existing && existing.status !== "revoked" && existing.status !== "rejected") return connectionForUi(existing);

  // A withdrawn/declined request still owns the unique class/student pair.
  // Reopen that row and invalidate its old consent instead of inserting a duplicate.
  if (existing) unwrap(await db.from("guardian_consents").delete().eq("request_id", existing.id));
  const payload = {
    class_id: classroom.id, teacher_id: classroom.teacher_id, student_id: studentId,
    status: initiatedBy === "student" ? "pending_teacher" : "pending_student",
    initiated_by: initiatedBy,
    student_approved_at: initiatedBy === "student" ? new Date().toISOString() : null,
    guardian_approved_at: null,
    created_at: new Date().toISOString(),
  };
  const write = (values: Record<string, unknown>) => existing
    ? db.from("monitoring_requests").update(values).eq("id", existing.id).eq("teacher_id", classroom.teacher_id).eq("student_id", studentId).in("status", ["revoked", "rejected"]).select("*").maybeSingle()
    : db.from("monitoring_requests").insert(values).select("*").single();
  let result = await write(payload);
  const missingInitiator = (result.error?.code === "PGRST204" || result.error?.code === "42703") && /initiated_by/.test(result.error.message);
  const legacyStatus = result.error?.code === "23514" && /monitoring_requests_status_check/.test(result.error.message);
  if (missingInitiator || legacyStatus) {
    // Before migration 005, student approval distinguishes an outgoing request.
    const legacy: Record<string, unknown> = { ...payload, status: "pending_student" };
    if (missingInitiator) delete legacy.initiated_by;
    result = await write(legacy);
  }
  if (result.error?.code === "23505") {
    // Another tab may have created the same request after our initial read.
    const concurrent = await find();
    if (concurrent && concurrent.status !== "revoked" && concurrent.status !== "rejected") return connectionForUi(concurrent);
  }
  const saved = unwrap<Connection | null>(result);
  if (!saved) throw new HttpError(409, "This connection request changed. Refresh and try again.");
  return connectionForUi(saved);
}

export async function inviteStudent(teacher: Profile, code: string) {
  const db = admin();
  const student = unwrap<Pick<Profile, "id"> | null>(await db.from("profiles").select("id").eq("student_code", code).eq("role", "student").maybeSingle());
  if (student) {
    const connection = await saveConnectionRequest(await defaultClass(teacher.id), student.id, "teacher");
    if (connection.status === "approved") return { message: "You are already connected with this student." };
    if (connection.status === "pending_teacher") return { message: "This student has already sent you a request. Review it under Incoming requests." };
  }
  // Do not disclose student identity or existence through ID enumeration.
  return { message: "If this Student ID is registered and a request is not already present, it is now available on the student’s Home page." };
}

export async function studentConnectsTeacher(student: Profile, code: string) {
  const db = admin();
  const lookup = await db.from("profiles").select("id").eq("teacher_code", code).eq("role", "teacher").maybeSingle();
  let teacher: Pick<Profile, "id"> | null;
  if (lookup.error?.code === "42703" || lookup.error?.code === "PGRST204") {
    const teachers = unwrap<Pick<Profile, "id">[]>(await db.from("profiles").select("id").eq("role", "teacher"));
    teacher = teachers.find(item => teacherCodeFor(item.id) === code) ?? null;
  } else teacher = unwrap<Pick<Profile, "id"> | null>(lookup);
  if (teacher) {
    const connection = await saveConnectionRequest(await defaultClass(teacher.id), student.id, "student");
    if (connection.status === "approved") return { message: "You are already connected with this teacher. No new request needed." };
    if (connection.status === "pending_student") return { message: "This teacher has already sent you a request. Review it under Teacher connections." };
  }
  return { message: "If this Teacher ID is registered and a request is not already present, the teacher can now review it. No records are shared until they accept." };
}

async function updateConnection(connection: Connection, values: Partial<Connection>) {
  const updated = unwrap<Connection | null>(await admin().from("monitoring_requests").update(values)
    .eq("id", connection.id).eq("teacher_id", connection.teacher_id).eq("student_id", connection.student_id)
    .eq("status", connection.status).eq("created_at", connection.created_at).select("*").maybeSingle());
  if (!updated) throw new HttpError(409, "This connection request changed. Refresh before trying again.");
  return updated;
}

export async function studentConnectionAction(student: Profile, id: string, action: "accept" | "approve" | "reject" | "revoke") {
  const db = admin();
  const connection = unwrap<Connection | null>(await db.from("monitoring_requests").select("*").eq("id", id).eq("student_id", student.id).maybeSingle());
  if (!connection) throw new HttpError(404, "Connection request not found.");
  const status = connectionForUi(connection).status;
  if (action === "reject" && status !== "pending_student") throw new HttpError(409, "This request is not awaiting your approval.");
  if (action === "reject" || action === "revoke") {
    if (action === "revoke" && !["pending_teacher", "pending_student", "approved"].includes(status)) throw new HttpError(409, "This connection is already closed.");
    await updateConnection(connection, { status: action === "reject" ? "rejected" : "revoked", student_approved_at: null, guardian_approved_at: null });
    unwrap(await db.from("guardian_consents").delete().eq("request_id", id));
    return { message: action === "reject" ? "Request rejected." : "Connection removed. Your progress is saved, and this teacher no longer has access." };
  }
  if (status !== "pending_student") throw new HttpError(409, "This request is not awaiting your approval.");
  await updateConnection(connection, { status: "approved", student_approved_at: new Date().toISOString(), guardian_approved_at: null });
  return { message: "Connection accepted. Their published courses are now in Courses, and they can view your learning progress." };
}

export async function teacherConnectionAction(teacher: Profile, id: string, action: "accept" | "reject") {
  const db = admin();
  const connection = unwrap<Connection | null>(await db.from("monitoring_requests").select("*").eq("id", id).eq("teacher_id", teacher.id).maybeSingle());
  if (!connection) throw new HttpError(404, "Connection request not found.");
  if (connectionForUi(connection).status !== "pending_teacher") throw new HttpError(409, "This request is not awaiting your decision.");
  if (action === "reject") {
    await updateConnection(connection, { status: "rejected", student_approved_at: null, guardian_approved_at: null });
    unwrap(await db.from("guardian_consents").delete().eq("request_id", id));
    return { message: "Connection request rejected." };
  }
  await updateConnection(connection, { status: "approved", guardian_approved_at: null });
  return { message: "Connection accepted. The student can see your published courses, and you can view their learning progress." };
}
