import { notFound } from "next/navigation";
import { pageProfile } from "@/lib/server/auth";
import { authorizedStudent, studentLearningRecords } from "@/lib/server/dashboards";
import { idSchema, HttpError } from "@/lib/server/http";
import { PageHeading } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { ProgressView } from "@/components/progress-view";
export default async function StudentProgress({ params }: { params: Promise<{ id: string }> }) {
  const teacher = await pageProfile("teacher"); const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  let student;
  try { student = await authorizedStudent(teacher.id, id); } catch (e) { if (e instanceof HttpError && (e.status === 403 || e.status === 404)) notFound(); throw e; }
  const records = await studentLearningRecords(id, teacher.id);
  const ongoing = records.enrollments.filter(e => e.status !== "completed").length;
  const completed = records.enrollments.filter(e => e.status === "completed").length;
  const due = records.revisions.filter(r => new Date(r.due_at) <= new Date()).length;
  return <><PageHeading eyebrow="AUTHORIZED STUDENT PROGRESS" title={student.display_name} description={`${student.student_code} · ${student.grade ?? "Student"} · ${ongoing} ongoing and ${completed} completed course${completed === 1 ? "" : "s"}`} action={<Badge tone="teal">Monitoring approved</Badge>} /><div className="mb-4 flex flex-wrap gap-2">{records.courses.map(c => <Badge key={c.id} tone="blue">{c.grade} · {c.subject} · {c.title}</Badge>)}</div><p className="mb-6 text-sm text-muted-foreground">Spaced revision: {due} due now · {records.revisions.length} scheduled · {records.misconceptions.filter(m => m.status === "active").length} active misconception{records.misconceptions.filter(m => m.status === "active").length === 1 ? "" : "s"}</p><ProgressView concepts={records.concepts} mastery={records.mastery} misconceptions={records.misconceptions} attempts={records.attempts} /></>;
}
