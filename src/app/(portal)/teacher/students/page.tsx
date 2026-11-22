import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import { pageProfile } from "@/lib/server/auth";
import { teacherData } from "@/lib/server/dashboards";
import { PageHeading, EmptyState } from "@/components/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TeacherConnectForm, TeacherRequestActions } from "@/components/teacher-connect";
import { ConnectionRefresh } from "@/components/connection-refresh";
import { percent } from "@/lib/utils";

export default async function StudentsPage() {
  const profile = await pageProfile("teacher");
  const data = await teacherData(profile.id);
  const incoming = data.requests.filter(request => request.status === "pending_teacher");
  const waiting = data.requests.filter(request => request.status === "pending_student");
  const closed = data.requests.filter(request => request.status === "rejected" || request.status === "revoked");
  return <>
    <PageHeading title={`Hello, ${profile.display_name}.`} description="Connect with students, approve their requests, and open the progress they have authorized." action={<Badge tone="teal">Teacher ID: {profile.teacher_code}</Badge>} />
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.4fr]">
      <Card className="p-5"><TeacherConnectForm /></Card>
      <Card>
        <CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>Incoming requests</CardTitle><ConnectionRefresh /></div><p className="text-xs leading-5 text-muted-foreground">Students who used your Teacher ID. Accept to share your published courses and view their learning progress, or reject the request.</p></CardHeader>
        <CardContent>{incoming.length ? <div className="space-y-4">{incoming.map(request => <div key={request.id} className="border-b pb-4 last:border-0 last:pb-0"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium">{request.student_name}</p><p className="font-mono text-xs text-muted-foreground">{request.student_code}</p></div><Badge tone="amber">Awaiting you</Badge></div><TeacherRequestActions connection={request} /></div>)}</div> : <p className="text-sm text-muted-foreground">No incoming requests yet.</p>}</CardContent>
      </Card>
    </div>
    {waiting.length > 0 && <Card className="mt-6"><CardHeader><CardTitle>Sent requests</CardTitle></CardHeader><CardContent><div className="space-y-3">{waiting.map(request => <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><div><span className="font-medium">{request.student_name}</span><span className="ml-2 font-mono text-xs text-muted-foreground">{request.student_code}</span></div><Badge tone="amber">Waiting for student</Badge></div>)}</div></CardContent></Card>}
    {closed.length > 0 && <Card className="mt-6"><CardHeader><CardTitle>Closed requests</CardTitle></CardHeader><CardContent><div className="space-y-3">{closed.map(request => <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><div><span className="font-medium">{request.student_name}</span><span className="ml-2 font-mono text-xs text-muted-foreground">{request.student_code}</span></div><Badge>{request.status === "rejected" ? "Rejected" : "Disconnected"}</Badge></div>)}</div></CardContent></Card>}
    <section aria-label="Connected students" className="mt-8 space-y-4"><h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Connected students</h2>
      {data.students.length ? <div className="grid gap-5 md:grid-cols-2">{data.students.map(student => <Card key={student.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><CardTitle>{student.display_name}</CardTitle><p className="mt-1 font-mono text-xs text-muted-foreground">{student.student_code}</p></div><Badge tone="teal">{student.records.enrollments.length} course{student.records.enrollments.length === 1 ? "" : "s"}</Badge></div><p className="mt-3 text-xs text-muted-foreground">Concept mastery {percent(student.average)} · {student.records.concepts.length} enrolled concepts</p><div className="mt-2"><Progress value={student.progress * 100} label={`${student.display_name} course progress`} /></div><Link href={`/teacher/students/${student.id}`} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary">View progress<ArrowRight /></Link></Card>)}</div> : <Card><EmptyState icon={Users} title="No connected students yet" description="Send a connection request with a Student ID, or wait for a student to use your Teacher ID." /></Card>}
    </section>
  </>;
}
