import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import type { Connection, Profile } from "@/lib/types";
import { teacherCodeFor } from "@/lib/teacher-code";
import { postgresRest } from "./fixtures/postgres-rest";

const mocks = vi.hoisted(() => ({ admin: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ admin: mocks.admin }));
import { connectionForUi, inviteStudent, monitoringAllowed, studentConnectionAction, studentConnectsTeacher, teacherConnectionAction } from "@/lib/server/monitoring";
import { readableCourse, studentConnectedToTeacher } from "@/lib/server/data";
import { authorizedStudent } from "@/lib/server/dashboards";

const teacher: Profile = { id: "61000000-0000-4000-8000-000000000001", role: "teacher", display_name: "Test teacher", institution: "Test school", student_code: null, teacher_code: "THT-6100000000", grade: null, age_band: null, guardian_email: null, created_at: "" };
const student: Profile = { ...teacher, id: "62000000-0000-4000-8000-000000000002", role: "student", display_name: "Test student", institution: null, student_code: "TH-2222222222", teacher_code: null, grade: "Class 10", age_band: "adult" };
const classroom = "63000000-0000-4000-8000-000000000003";

describe("two-way connection lifecycle", () => {
  let db: PGlite;
  const email = vi.fn();
  const rows = async () => (await db.query<Connection>("select * from monitoring_requests")).rows;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to authenticated, service_role;
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
      grant usage on schema storage to authenticated, service_role;
      grant select on storage.objects to authenticated;
    `);
    await db.exec(await readFile(new URL("../supabase/migrations/202611210001_initial.sql", import.meta.url), "utf8"));
    for (const migration of ["202611210005_teacher_ids_and_two_way_connections.sql", "202611210007_course_ownership_and_permissions.sql", "202611220008_direct_teacher_student_connections.sql"]) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${migration}`, import.meta.url), "utf8"));
    }
  }, 60000);
  beforeEach(async () => {
    await db.exec("begin");
    await db.query("insert into auth.users values ($1),($2)", [teacher.id, student.id]);
    await db.query("insert into profiles(id,role,display_name,institution,teacher_code) values ($1,'teacher','Test teacher','Test school',$2)", [teacher.id, teacherCodeFor(teacher.id)]);
    await db.query("insert into profiles(id,role,display_name,student_code,age_band) values ($1,'student','Test student',$2,'adult')", [student.id, student.student_code]);
    await db.query("insert into classes(id,teacher_id,name,subject) values ($1,$2,'Test class','Physics')", [classroom, teacher.id]);
    mocks.admin.mockReturnValue(createClient("https://test.supabase.co", "test-key", { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: postgresRest(db) } }));
    email.mockReset().mockResolvedValue(Response.json({ id: "test-email" }));
    vi.stubGlobal("fetch", email);
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");
  });
  afterEach(async () => { await db.exec("rollback"); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  afterAll(async () => { await db.close(); });

  it("saves a student request in the teacher's incoming state", async () => {
    await studentConnectsTeacher(student, teacherCodeFor(teacher.id));
    const [request] = await rows();
    expect(connectionForUi(request).status).toBe("pending_teacher");
    expect(request.student_approved_at).toBeTruthy();
    expect(request.guardian_approved_at).toBeNull();
    expect(monitoringAllowed(request)).toBe(false);
  });

  it.each(["revoked", "rejected"])("reopens a %s request instead of violating the unique constraint", async status => {
    await db.query("insert into monitoring_requests(class_id,teacher_id,student_id,status,student_approved_at,guardian_approved_at) values ($1,$2,$3,$4,now(),now())", [classroom, teacher.id, student.id, status]);
    const [old] = await rows();
    await db.query("insert into guardian_consents(request_id,token_hash,expires_at) values ($1,'stale-token',now()+interval '1 hour')", [old.id]);
    await studentConnectsTeacher(student, teacherCodeFor(teacher.id));
    const requests = await rows();
    expect(requests).toHaveLength(1);
    expect(requests[0].id).toBe(old.id);
    expect(connectionForUi(requests[0]).status).toBe("pending_teacher");
    expect(requests[0].guardian_approved_at).toBeNull();
    expect((await db.query("select * from guardian_consents")).rows).toHaveLength(0);
  });

  it("keeps simultaneous sends and repeated sends idempotent", async () => {
    await Promise.all([studentConnectsTeacher(student, teacherCodeFor(teacher.id)), studentConnectsTeacher(student, teacherCodeFor(teacher.id))]);
    const before = await rows();
    expect(before).toHaveLength(1);
    await studentConnectsTeacher(student, teacherCodeFor(teacher.id));
    expect(await rows()).toEqual(before);
  });

  it("sends teacher invitations to the student without fabricating student approval", async () => {
    await inviteStudent(teacher, student.student_code!);
    const [request] = await rows();
    expect(connectionForUi(request).status).toBe("pending_student");
    expect(request.student_approved_at).toBeNull();
    await expect(teacherConnectionAction(teacher, request.id, "accept")).rejects.toMatchObject({ status: 409 });
    await studentConnectionAction(student, request.id, "reject");
    await inviteStudent(teacher, student.student_code!);
    const reopened = await rows();
    expect(reopened).toHaveLength(1);
    expect(reopened[0].id).toBe(request.id);
    expect(reopened[0].student_approved_at).toBeNull();
    expect(connectionForUi(reopened[0]).status).toBe("pending_student");
  });

  it("does not let either account accept its own outgoing request or another account's request", async () => {
    await studentConnectsTeacher(student, teacherCodeFor(teacher.id));
    const [request] = await rows();
    await expect(studentConnectionAction(student, request.id, "accept")).rejects.toMatchObject({ status: 409 });
    await expect(teacherConnectionAction({ ...teacher, id: student.id }, request.id, "accept")).rejects.toMatchObject({ status: 404 });
    await expect(studentConnectionAction({ ...student, id: teacher.id }, request.id, "revoke")).rejects.toMatchObject({ status: 404 });
    expect(monitoringAllowed((await rows())[0])).toBe(false);
  });

  describe.each(["adult", "under18"] as const)("%s student", age_band => {
    it.each(["student", "teacher"] as const)("shares courses and progress only after the recipient accepts a %s-initiated request", async initiator => {
      await db.query("update profiles set age_band=$1,guardian_email=null where id=$2", [age_band, student.id]);
      const learner = { ...student, age_band };
      const { rows: courses } = await db.query<{ id: string }>("insert into courses(owner_id,course_kind,title,description,subject,grade,status) values ($1,'teacher','Shared course','Test course','Physics','Class 10','published') returning id", [teacher.id]);
      const courseId = courses[0].id;
      if (initiator === "student") await studentConnectsTeacher(learner, teacherCodeFor(teacher.id));
      else await inviteStudent(teacher, student.student_code!);
      const [request] = await rows();

      expect(await studentConnectedToTeacher(student.id, teacher.id)).toBe(false);
      await expect(readableCourse(courseId, learner)).rejects.toMatchObject({ status: 404 });
      await expect(authorizedStudent(teacher.id, student.id)).rejects.toMatchObject({ status: 403 });
      if (initiator === "student") await teacherConnectionAction(teacher, request.id, "accept");
      else await studentConnectionAction(learner, request.id, "accept");

      const [accepted] = await rows();
      expect(monitoringAllowed(accepted)).toBe(true);
      expect(accepted.guardian_approved_at).toBeNull();
      expect(await studentConnectedToTeacher(student.id, teacher.id)).toBe(true);
      expect((await readableCourse(courseId, learner)).course.id).toBe(courseId);
      expect((await authorizedStudent(teacher.id, student.id)).id).toBe(student.id);
      expect(email).not.toHaveBeenCalled();

      // Duplicate sends must preserve the accepted connection.
      await inviteStudent(teacher, student.student_code!);
      await studentConnectsTeacher(learner, teacherCodeFor(teacher.id));
      expect(await rows()).toEqual([accepted]);
      await studentConnectionAction(learner, request.id, "revoke");
      expect(await studentConnectedToTeacher(student.id, teacher.id)).toBe(false);
      await expect(readableCourse(courseId, learner)).rejects.toMatchObject({ status: 404 });
      await expect(authorizedStudent(teacher.id, student.id)).rejects.toMatchObject({ status: 403 });
      await expect(teacherConnectionAction(teacher, request.id, "accept")).rejects.toMatchObject({ status: 409 });
    });
  });

  it.each(["student", "teacher"] as const)("rejects a %s-initiated request without sharing and permits a fresh request", async initiator => {
    if (initiator === "student") await studentConnectsTeacher(student, teacherCodeFor(teacher.id));
    else await inviteStudent(teacher, student.student_code!);
    const [request] = await rows();
    if (initiator === "student") await teacherConnectionAction(teacher, request.id, "reject");
    else await studentConnectionAction(student, request.id, "reject");
    expect((await rows())[0].status).toBe("rejected");
    expect(await studentConnectedToTeacher(student.id, teacher.id)).toBe(false);
    await expect(authorizedStudent(teacher.id, student.id)).rejects.toMatchObject({ status: 403 });
    await expect(studentConnectionAction(student, request.id, "accept")).rejects.toMatchObject({ status: 409 });
    await expect(teacherConnectionAction(teacher, request.id, "accept")).rejects.toMatchObject({ status: 409 });
    if (initiator === "student") await studentConnectsTeacher(student, teacherCodeFor(teacher.id));
    else await inviteStudent(teacher, student.student_code!);
    expect((await rows())[0].status).toBe(initiator === "student" ? "pending_teacher" : "pending_student");
    expect(email).not.toHaveBeenCalled();
  });

  it("keeps opposite-direction sends pending until the recipient explicitly accepts", async () => {
    await inviteStudent(teacher, student.student_code!);
    await studentConnectsTeacher(student, teacherCodeFor(teacher.id));
    expect((await rows())[0].status).toBe("pending_student");
    expect(monitoringAllowed((await rows())[0])).toBe(false);
  });

  it("accepts the old approve action from an already open student page", async () => {
    await inviteStudent(teacher, student.student_code!);
    await studentConnectionAction(student, (await rows())[0].id, "approve");
    expect(monitoringAllowed((await rows())[0])).toBe(true);
  });

  it("handles multiple class requests for the same teacher without a single-row lookup failure", async () => {
    await inviteStudent(teacher, student.student_code!);
    const { rows: classes } = await db.query<{ id: string }>("insert into classes(teacher_id,name,subject) values ($1,'Second class','Physics') returning id", [teacher.id]);
    await db.query("insert into monitoring_requests(class_id,teacher_id,student_id,status,student_approved_at) values ($1,$2,$3,'approved',now())", [classes[0].id, teacher.id, student.id]);
    expect(await studentConnectedToTeacher(student.id, teacher.id)).toBe(true);
  });
});

it("keeps explicit teacher invitations in the student's incoming list even with a legacy approval timestamp", () => {
  expect(connectionForUi({ status: "pending_student", initiated_by: "teacher", student_approved_at: "old-value" }).status).toBe("pending_student");
});
