import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { scheduleRevision, updateMastery } from "@/lib/learning/engine";
import type { Evaluation, Mastery, Revision } from "@/lib/types";

// Real PostgreSQL execution in WASM. Only Supabase-owned auth/storage base objects are facades;
// application schema, seed, grants, RLS and transactional RPCs are the exact shipped SQL.
let db: PGlite;
const student = "30000000-0000-4000-8000-000000000001";
const otherStudent = "30000000-0000-4000-8000-000000000002";
const teacher = "30000000-0000-4000-8000-000000000003";
const minor = "30000000-0000-4000-8000-000000000004";
const classroom = "40000000-0000-4000-8000-000000000001";
const course = "10000000-0000-4000-8000-000000000001";
const concept = "20000000-0000-4000-8000-000000000001";
const evaluation: Evaluation = { answer_score: 0, reasoning_score: 0.2, correctness: "incorrect", reasoning_verdict: "flawed", feedback: "Current is conserved.", reasoning_feedback: "Energy is transferred; current is not used up.", misconceptions: [{ key: "current-used-up", description: "Current is used up.", evidence: "Less current leaves the bulb." }], resolved_misconceptions: [] };
const json = JSON.stringify;
async function value<T>(sql: string, params: unknown[] = []) { return (await db.query<{ result: T }>(sql, params)).rows[0]?.result; }
async function draftCourse(owner: string, kind: "student" | "teacher", title: string) {
  const syllabus = { title, subject: "Physics", grade: "Class 10", description: "A focused test course with two connected topics.", concepts: [
    { slug: "first-topic", title: "First topic", summary: "A starting concept.", prerequisites: [], content: { explanation: "A clear explanation of the first topic for this test course.", examples: [{ problem: "Example", solution: "Answer" }], misconceptions: [], revision_notes: "Review the first topic." } },
    { slug: "second-topic", title: "Second topic", summary: "A dependent concept.", prerequisites: ["first-topic"], content: { explanation: "A clear explanation of the second topic for this test course.", examples: [{ problem: "Example", solution: "Answer" }], misconceptions: [], revision_notes: "Review the second topic." } },
  ] };
  return value<string>("select create_course_draft($1,$2,$3::jsonb,null) as result", [owner, kind, json(syllabus)]);
}
async function connect(studentId: string) {
  await db.query("insert into monitoring_requests(class_id,teacher_id,student_id,status,initiated_by,student_approved_at) values ($1,$2,$3,'approved','student',now())", [classroom, teacher, studentId]);
}
async function expectFailure(sql: string, params: unknown[], pattern: RegExp) {
  await db.exec("savepoint expected_failure");
  await expect(db.query(sql, params)).rejects.toThrow(pattern);
  await db.exec("rollback to expected_failure");
}
async function asUser(id: string) { await db.query("select set_config('request.jwt.claim.sub', $1, true)", [id]); await db.exec("set local role authenticated"); }
async function enroll(id = student) { return value<string>("select enroll_course($1,$2,'scratch') as result", [id, course]); }
async function question(eid: string, index = 0) {
  const version = await value<number>("select version as result from learning_sessions where enrollment_id=$1", [eid]);
  const token = randomUUID();
  expect(await value<boolean>("select claim_session($1,$2,$3) as result", [eid, token, version])).toBe(true);
  const data = { concept_id: concept, kind: "diagnostic", difficulty: "easy", prompt: `What current leaves a bulb if ${index + 1} A enters?`, options: [], correct_answer: `${index + 1} A`, explanation: "Charge is conserved in a steady series circuit.", rubric: "Explain charge conservation.", fingerprint: `question-${index}`, source: "bank" };
  return value<string>("select save_question($1,$2,$3::jsonb,null) as result", [eid, token, json(data)]);
}
async function commit(eid: string, qid: string, overrides: { revisionInterval?: number; diagnostic?: object | null } = {}) {
  const version = await value<number>("select version as result from learning_sessions where enrollment_id=$1", [eid]);
  const token = randomUUID();
  expect(await value<boolean>("select claim_session($1,$2,$3) as result", [eid, token, version])).toBe(true);
  const previous = await value<Mastery | undefined>("select row_to_json(m) as result from concept_mastery m where enrollment_id=$1 and concept_id=$2", [eid, concept]);
  const previousRevision = await value<Revision | undefined>("select row_to_json(r) as result from revision_schedules r where enrollment_id=$1 and concept_id=$2", [eid, concept]);
  const mastery = updateMastery(previous, evaluation, "easy", false, eid, concept);
  const revision = scheduleRevision(previousRevision, mastery, evaluation, false, true);
  if (overrides.revisionInterval !== undefined) revision.interval_days = overrides.revisionInterval;
  const params = [eid, qid, token, "0.5 A", "Less current leaves because the bulb uses some up.", false, json(evaluation), json(mastery), json(revision), "reteach", overrides.diagnostic ? json(overrides.diagnostic) : null, false];
  return { params, execute: () => value<string>("select commit_answer($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11::jsonb,$12) as result", params) };
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated, service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
    grant usage on schema storage to authenticated, service_role;
    grant select on storage.objects to authenticated;
  `);
  const migrationDir = new URL("../supabase/migrations/", import.meta.url);
  const migrations = (await readdir(migrationDir)).filter(file => file.endsWith(".sql")).sort();
  for (const migration of migrations) await db.exec(await readFile(new URL(migration, migrationDir), "utf8"));
  await db.exec(await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"));
}, 60000);
beforeEach(async () => {
  await db.exec("begin");
  for (const id of [student, otherStudent, teacher, minor]) await db.query("insert into auth.users(id) values ($1)", [id]);
  await db.query("insert into profiles(id,role,display_name,student_code,age_band) values ($1,'student','Student One','TH-1111111111','adult'),($2,'student','Student Two','TH-2222222222','adult')", [student, otherStudent]);
  await db.query("insert into profiles(id,role,display_name,institution,teacher_code) values ($1,'teacher','Teacher One','Example School','THT-3333333333')", [teacher]);
  await db.query("insert into profiles(id,role,display_name,student_code,age_band,guardian_email) values ($1,'student','Minor Student','TH-3333333333','under18','guardian@example.test')", [minor]);
  await db.query("insert into classes(id,teacher_id,name,subject) values ($1,$2,'Class 10 A','Physics')", [classroom, teacher]);
});
afterEach(async () => { await db.exec("rollback; reset role"); });
afterAll(async () => { await db.close(); });

describe("shipped PostgreSQL migration and syllabus", () => {
  it("seeds complete, connected courses and 30 validated reference questions", async () => {
    expect(await value<number>("select count(*)::int as result from concepts")).toBe(84);
    expect(await value<number>("select count(*)::int as result from question_bank")).toBe(30);
    expect(await value<number>("select count(*)::int as result from prerequisites")).toBe(70);
    expect(await value<number>("select count(*)::int as result from courses where status='published'")).toBe(18);
    // Seeding again must not duplicate course content.
    await db.exec(await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8"));
    expect(await value<number>("select count(*)::int as result from question_bank")).toBe(30);
  });
  it("publishes a default course for all five subjects in Classes 10, 11 and 12", async () => {
    const missing = await value<number>(`select count(*)::int as result from (values
      ('Class 10','Physics'),('Class 10','Chemistry'),('Class 10','Mathematics'),('Class 10','Biology'),('Class 10','English'),
      ('Class 11','Physics'),('Class 11','Chemistry'),('Class 11','Mathematics'),('Class 11','Biology'),('Class 11','English'),
      ('Class 12','Physics'),('Class 12','Chemistry'),('Class 12','Mathematics'),('Class 12','Biology'),('Class 12','English')
    ) as expected(grade,subject) where not exists (select 1 from courses c where c.status='published' and c.grade=expected.grade and c.subject=expected.subject)`);
    expect(missing).toBe(0);
  });
  it("publishes every course with concepts and resolvable prerequisites", async () => {
    const empty = await value<number>("select count(*)::int as result from courses c where c.status='published' and not exists (select 1 from concepts k where k.course_id=c.id)");
    expect(empty).toBe(0);
    const orphans = await value<number>("select count(*)::int as result from prerequisites p join concepts k on k.id=p.concept_id join concepts r on r.id=p.prerequisite_id where p.course_id <> k.course_id or p.course_id <> r.course_id");
    expect(orphans).toBe(0);
    const gaps = await value<number>("select count(*)::int as result from courses c where c.status='published' and (select count(*) from concepts k where k.course_id=c.id) < 4");
    expect(gaps).toBe(0);
  });
  it("requires teacher IDs and supports student-initiated connections with explicit approval", async () => {
    expect(await value<number>("select count(*)::int as result from profiles where role='teacher' and teacher_code is null")).toBe(0);
    await db.query("insert into monitoring_requests(class_id,teacher_id,student_id,status,initiated_by,student_approved_at) values ($1,$2,$3,'pending_teacher','student',now())", [classroom, teacher, student]);
    expect(await value<number>("select count(*)::int as result from monitoring_requests where status='pending_teacher'")).toBe(1);
    await db.query("update monitoring_requests set status='approved', guardian_approved_at=null where teacher_id=$1 and student_id=$2", [teacher, student]);
    expect(await value<string>("select status as result from monitoring_requests where teacher_id=$1 and student_id=$2", [teacher, student])).toBe("approved");
  });
  it("creates the enrollment, session and mandatory diagnostic atomically and resumes instead of reenrolling", async () => {
    const eid = await enroll(); const qid = await question(eid);
    expect(await enroll()).toBe(eid);
    expect(await value<string>("select current_question_id as result from learning_sessions where enrollment_id=$1", [eid])).toBe(qid);
    expect(await value<string>("select status as result from enrollments where id=$1", [eid])).toBe("diagnostic");
    expect(await value<number>("select count(*)::int as result from diagnostics where enrollment_id=$1", [eid])).toBe(1);
  });
  it("prevents competing generation leases and stale writers", async () => {
    const eid = await enroll(); const first = randomUUID(); const second = randomUUID();
    expect(await value<boolean>("select claim_session($1,$2,0) as result", [eid, first])).toBe(true);
    expect(await value<boolean>("select claim_session($1,$2,0) as result", [eid, second])).toBe(false);
    await db.query("select release_session($1,$2)", [eid, second]);
    expect(await value<string>("select operation_token as result from learning_sessions where enrollment_id=$1", [eid])).toBe(first);
  });
  it("commits answer, reasoning, mastery, misconceptions, revision and exact resume state together", async () => {
    const eid = await enroll(); const qid = await question(eid); const operation = await commit(eid, qid); const aid = await operation.execute();
    expect(await value<number>("select count(*)::int as result from attempts where enrollment_id=$1", [eid])).toBe(1);
    expect(await value<number>("select attempts as result from concept_mastery where enrollment_id=$1", [eid])).toBe(1);
    expect(await value<string>("select status as result from misconceptions where enrollment_id=$1", [eid])).toBe("active");
    expect(await value<number>("select interval_days as result from revision_schedules where enrollment_id=$1", [eid])).toBe(1);
    expect(await value<string>("select last_attempt_id as result from learning_sessions where enrollment_id=$1", [eid])).toBe(aid);
    expect(await value<number>("select diagnostic_count as result from enrollments where id=$1", [eid])).toBe(1);
    expect(await operation.execute()).toBe(aid);
    expect(await value<number>("select diagnostic_count as result from enrollments where id=$1", [eid])).toBe(1);
  });
  it("rolls back all evidence if any part of an answer transaction fails", async () => {
    const eid = await enroll(); const qid = await question(eid); const operation = await commit(eid, qid, { revisionInterval: 0 });
    await db.exec("savepoint invalid_answer"); await expect(operation.execute()).rejects.toThrow(); await db.exec("rollback to invalid_answer");
    expect(await value<number>("select count(*)::int as result from attempts where enrollment_id=$1", [eid])).toBe(0);
    expect(await value<number>("select count(*)::int as result from concept_mastery where enrollment_id=$1", [eid])).toBe(0);
    expect(await value<number>("select count(*)::int as result from misconceptions where enrollment_id=$1", [eid])).toBe(0);
  });
  it("persists diagnostic completion and mode changes without resetting saved work", async () => {
    const eid = await enroll();
    for (let i = 0; i < 3; i++) {
      const qid = await question(eid, i);
      const operation = await commit(eid, qid, { diagnostic: i === 2 ? { recommended_mode: "scratch", starting_concept_id: concept, question_count: 3, summary: "Start with current." } : null });
      await operation.execute();
    }
    await db.query("select set_learning_mode($1,'prior')", [eid]);
    expect(await enroll()).toBe(eid);
    expect(await value<string>("select status as result from diagnostics where enrollment_id=$1", [eid])).toBe("completed");
    expect(await value<string>("select status as result from enrollments where id=$1", [eid])).toBe("learning");
    expect(await value<string>("select mode as result from enrollments where id=$1", [eid])).toBe("prior");
    expect(await value<number>("select count(*)::int as result from attempts where enrollment_id=$1", [eid])).toBe(3);
    expect(await value<number>("select attempts as result from concept_mastery where enrollment_id=$1", [eid])).toBe(3);
  });
});

describe("course ownership, visibility and safe deletion", () => {
  it("keeps a student-created course private to its owner", async () => {
    const privateCourse = await draftCourse(student, "student", "My private course");
    await db.query("update courses set status='approved' where id=$1", [privateCourse]);
    await asUser(student);
    expect(await value<number>("select count(*)::int as result from courses where id=$1", [privateCourse])).toBe(1);
    await db.exec("reset role"); await asUser(otherStudent);
    expect(await value<number>("select count(*)::int as result from courses where id=$1", [privateCourse])).toBe(0);
    expect(await value<number>("select count(*)::int as result from concepts where course_id=$1", [privateCourse])).toBe(0);
    await db.exec("reset role");
    await connect(student);
    await asUser(teacher);
    expect(await value<number>("select count(*)::int as result from courses where id=$1", [privateCourse])).toBe(0);
    await db.exec("reset role");
    await expectFailure("select enroll_course($1,$2,'scratch')", [otherStudent, privateCourse], /Course not available/);
  });

  it("shows a teacher course only to its owner and approved connected students", async () => {
    const shared = await draftCourse(teacher, "teacher", "Teacher course");
    await connect(student);
    await asUser(student);
    expect(await value<number>("select count(*)::int as result from courses where id=$1", [shared])).toBe(0);
    await db.exec("reset role");
    await db.query("select publish_course($1,$2)", [shared, teacher]);
    await asUser(student);
    expect(await value<number>("select count(*)::int as result from courses where id=$1", [shared])).toBe(1);
    expect(await value<number>("select count(*)::int as result from concepts where course_id=$1", [shared])).toBe(2);
    await db.exec("reset role"); await asUser(otherStudent);
    expect(await value<number>("select count(*)::int as result from courses where id=$1", [shared])).toBe(0);
    await db.exec("reset role"); await asUser(teacher);
    expect(await value<number>("select count(*)::int as result from courses where id=$1", [shared])).toBe(1);
    await db.exec("reset role");
    await expectFailure("select publish_course($1,$2)", [shared, student], /Only your teacher course/);
  });

  it("prevents enrollment in teacher courses until the connection is approved", async () => {
    const shared = await draftCourse(teacher, "teacher", "Connected only");
    await db.query("select publish_course($1,$2)", [shared, teacher]);
    await expectFailure("select enroll_course($1,$2,'scratch')", [student, shared], /Course not available/);
    await connect(student);
    expect(await value<string>("select enroll_course($1,$2,'scratch') as result", [student, shared])).toEqual(expect.any(String));
    await expectFailure("select enroll_course($1,$2,'scratch')", [otherStudent, shared], /Course not available/);
  });

  it("lets owners soft-delete custom courses without deleting progress or unrelated records", async () => {
    const privateCourse = await draftCourse(student, "student", "Temporary course");
    await db.query("update courses set status='approved' where id=$1", [privateCourse]);
    const eid = await value<string>("select enroll_course($1,$2,'scratch') as result", [student, privateCourse]);
    await expectFailure("select delete_course($1,$2)", [privateCourse, otherStudent], /only delete your own/);
    expect(await value<boolean>("select delete_course($1,$2) as result", [privateCourse, student])).toBe(true);
    expect(await value<number>("select count(*)::int as result from courses where id=$1 and deleted_at is not null", [privateCourse])).toBe(1);
    expect(await value<number>("select count(*)::int as result from enrollments where id=$1", [eid])).toBe(1);
    expect(await value<number>("select count(*)::int as result from concepts where course_id=$1", [privateCourse])).toBe(2);
    await asUser(student);
    expect(await value<number>("select count(*)::int as result from courses where id=$1", [privateCourse])).toBe(0);
    await db.exec("reset role");
    await expectFailure("select delete_course($1,$2)", [course, student], /only delete your own/);
  });

  it("removes a deleted teacher course from connected students while keeping their enrollment", async () => {
    const shared = await draftCourse(teacher, "teacher", "To be retired");
    await db.query("select publish_course($1,$2)", [shared, teacher]);
    await connect(student);
    const eid = await value<string>("select enroll_course($1,$2,'scratch') as result", [student, shared]);
    expect(await value<boolean>("select delete_course($1,$2) as result", [shared, teacher])).toBe(true);
    await asUser(student);
    expect(await value<number>("select count(*)::int as result from courses where id=$1", [shared])).toBe(0);
    await db.exec("reset role");
    expect(await value<number>("select count(*)::int as result from enrollments where id=$1", [eid])).toBe(1);
  });
});

describe("database-enforced role and monitoring authorization", () => {
  it("hides other students and their learning records from an authenticated student", async () => {
    const eid = await enroll(); await enroll(otherStudent); await asUser(student);
    expect(await value<number>("select count(*)::int as result from profiles")).toBe(1);
    expect(await value<number>("select count(*)::int as result from enrollments")).toBe(1);
    expect(await value<string>("select id as result from enrollments")).toBe(eid);
  });
  it("does not let a student forge mastery, change roles, or call grading RPCs", async () => {
    const eid = await enroll(); await asUser(student);
    for (const sql of ["update profiles set role='teacher'", "insert into concept_mastery(enrollment_id,concept_id,score) values (null,null,1)", `select claim_session('${eid}','${randomUUID()}',0)`, "select * from questions", "select * from question_bank"]) {
      await db.exec("savepoint forbidden"); await expect(db.exec(sql)).rejects.toThrow(/permission denied/); await db.exec("rollback to forbidden");
    }
  });
  it("keeps teacher records hidden until approved and revokes access immediately", async () => {
    await enroll(); await db.query("insert into monitoring_requests(class_id,teacher_id,student_id) values ($1,$2,$3)", [classroom, teacher, student]);
    await asUser(teacher); expect(await value<number>("select count(*)::int as result from enrollments")).toBe(0);
    await db.exec("reset role"); await db.query("update monitoring_requests set status='approved', student_approved_at=now() where student_id=$1", [student]);
    await asUser(teacher); expect(await value<number>("select count(*)::int as result from enrollments")).toBe(1);
    // Monitoring never grants access to private profile fields such as guardian email.
    expect(await value<number>("select count(*)::int as result from profiles where id <> auth.uid()")).toBe(0);
    await db.exec("reset role"); await db.query("update monitoring_requests set status='revoked' where student_id=$1", [student]);
    await asUser(teacher); expect(await value<number>("select count(*)::int as result from enrollments")).toBe(0);
  });
  it.each(["student", "teacher"])("grants an under-18 learner course access and progress sharing after a %s-initiated connection is accepted", async initiator => {
    await db.query("update profiles set guardian_email=null where id=$1", [minor]);
    const eid = await enroll(minor);
    const qid = await question(eid);
    await (await commit(eid, qid)).execute();
    const shared = await draftCourse(teacher, "teacher", "Shared with accepted students");
    await db.query("select publish_course($1,$2)", [shared, teacher]);
    await db.query("insert into monitoring_requests(class_id,teacher_id,student_id,status,initiated_by,student_approved_at) values ($1,$2,$3,$4,$5,$6)", [classroom, teacher, minor, initiator === "student" ? "pending_teacher" : "pending_student", initiator, initiator === "student" ? new Date().toISOString() : null]);

    await asUser(minor);
    expect(await value<number>("select count(*)::int as result from courses where id=$1", [shared])).toBe(0);
    await db.exec("reset role"); await asUser(teacher);
    expect(await value<number>("select count(*)::int as result from attempts")).toBe(0);
    await db.exec("reset role");
    await expectFailure("select enroll_course($1,$2,'scratch')", [minor, shared], /Course not available/);

    await db.query("update monitoring_requests set status='approved',student_approved_at=coalesce(student_approved_at,now()) where student_id=$1", [minor]);
    expect(await value<string | null>("select guardian_approved_at as result from monitoring_requests where student_id=$1", [minor])).toBeNull();
    await asUser(minor);
    expect(await value<number>("select count(*)::int as result from courses where id=$1", [shared])).toBe(1);
    await db.exec("reset role");
    expect(await value<string>("select enroll_course($1,$2,'scratch') as result", [minor, shared])).toEqual(expect.any(String));
    await asUser(teacher);
    expect(await value<number>("select count(*)::int as result from enrollments")).toBe(2);
    expect(await value<number>("select count(*)::int as result from attempts")).toBe(1);
    expect(await value<number>("select count(*)::int as result from concept_mastery")).toBe(1);
    await expectFailure("update monitoring_requests set status='approved'", [], /permission denied/);

    await db.exec("reset role");
    await db.query("update monitoring_requests set status='revoked',student_approved_at=null where student_id=$1", [minor]);
    await asUser(teacher);
    expect(await value<number>("select count(*)::int as result from attempts")).toBe(0);
    expect(await value<number>("select count(*)::int as result from concept_mastery")).toBe(0);
    await db.exec("reset role"); await asUser(minor);
    expect(await value<number>("select count(*)::int as result from courses where id=$1", [shared])).toBe(0);
    await db.exec("reset role");
    expect(await value<number>("select count(*)::int as result from attempts where enrollment_id=$1", [eid])).toBe(1);
  });
  it("does not expose private student-course progress through direct teacher database reads", async () => {
    const privateCourse = await draftCourse(student, "student", "Private student learning");
    await db.query("update courses set status='approved' where id=$1", [privateCourse]);
    const eid = await value<string>("select enroll_course($1,$2,'scratch') as result", [student, privateCourse]);
    await connect(student);
    await asUser(teacher);
    expect(await value<number>("select count(*)::int as result from enrollments where id=$1", [eid])).toBe(0);
    expect(await value<boolean>("select can_read_enrollment($1) as result", [eid])).toBe(false);
  });
  it("requires student agreement even after removing the guardian step", async () => {
    await expectFailure("insert into monitoring_requests(class_id,teacher_id,student_id,status) values ($1,$2,$3,'approved')", [classroom, teacher, minor], /Student approval/);
    await expectFailure("insert into monitoring_requests(class_id,teacher_id,student_id,status) values ($1,$2,$3,'pending_teacher')", [classroom, teacher, minor], /Student approval/);
    expect(await value<boolean>("select consume_guardian_consent('old-token') as result")).toBe(false);
  });
  it("protects uploaded syllabuses from other students and approved teachers", async () => {
    await db.query("insert into storage.objects(bucket_id,name) values ('syllabuses',$1),('syllabuses',$2)", [`${student}/private.pdf`, `${otherStudent}/private.pdf`]);
    await asUser(student); expect(await value<number>("select count(*)::int as result from storage.objects")).toBe(1);
    await db.exec("reset role"); await asUser(teacher); expect(await value<number>("select count(*)::int as result from storage.objects")).toBe(0);
  });
  it("enforces shared rate limits in the database", async () => {
    expect(await value<boolean>("select check_rate_limit('test-user',2,60) as result")).toBe(true);
    expect(await value<boolean>("select check_rate_limit('test-user',2,60) as result")).toBe(true);
    expect(await value<boolean>("select check_rate_limit('test-user',2,60) as result")).toBe(false);
  });
});

describe("upgrading existing connections", () => {
  it("unblocks already accepted requests, preserves undecided requests and saved progress, and expires old email links", async () => {
    // Recreate the preceding connection rules to exercise the actual upgrade.
    await db.exec(await readFile(new URL("../supabase/migrations/202611210005_teacher_ids_and_two_way_connections.sql", import.meta.url), "utf8"));
    await db.exec("alter table profiles add constraint legacy_guardian_required check (role <> 'student' or age_band <> 'under18' or guardian_email is not null)");
    const eid = await enroll(minor);
    const fixtures = [
      { status: "pending_guardian", initiator: "teacher", agreed: true, expected: "approved" },
      { status: "pending_guardian", initiator: "student", agreed: true, expected: "approved" },
      { status: "pending_teacher", initiator: "student", agreed: true, expected: "pending_teacher" },
      { status: "pending_student", initiator: "teacher", agreed: false, expected: "pending_student" },
      { status: "pending_student", initiator: "teacher", agreed: true, expected: "pending_teacher" },
      { status: "rejected", initiator: "teacher", agreed: false, expected: "rejected" },
      { status: "revoked", initiator: "student", agreed: false, expected: "revoked" },
    ];
    const ids: string[] = [];
    for (const fixture of fixtures) {
      const cid = await value<string>("insert into classes(teacher_id,name,subject) values ($1,'Legacy class','Physics') returning id as result", [teacher]);
      const rid = await value<string>("insert into monitoring_requests(class_id,teacher_id,student_id,status,initiated_by,student_approved_at) values ($1,$2,$3,$4,$5,$6) returning id as result", [cid, teacher, minor, fixture.status, fixture.initiator, fixture.agreed ? new Date().toISOString() : null]);
      ids.push(rid);
      if (fixture.status === "pending_guardian") await db.query("insert into guardian_consents(request_id,token_hash,expires_at) values ($1,$2,now()+interval '1 hour')", [rid, rid]);
    }
    const migration = await readFile(new URL("../supabase/migrations/202611220008_direct_teacher_student_connections.sql", import.meta.url), "utf8");
    await db.exec(migration);
    await db.exec(migration); // Applying the manual SQL again is safe.
    for (const [index, id] of ids.entries()) {
      expect(await value<string>("select status as result from monitoring_requests where id=$1", [id])).toBe(fixtures[index].expected);
      expect(await value<string | null>("select guardian_approved_at as result from monitoring_requests where id=$1", [id])).toBeNull();
    }
    expect(await value<string>("select initiated_by as result from monitoring_requests where id=$1", [ids[4]])).toBe("student");
    expect(await value<number>("select count(*)::int as result from guardian_consents where consumed_at is null")).toBe(0);
    expect(await value<boolean>("select consume_guardian_consent($1) as result", [ids[0]])).toBe(false);
    expect(await enroll(minor)).toBe(eid);
    await db.query("update profiles set guardian_email=null where id=$1", [minor]);
  });
});
