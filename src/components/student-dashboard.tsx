import Link from "next/link";
import { ArrowRight, CheckCircle2, Users } from "lucide-react";
import type { Profile } from "@/lib/types";
import type { StudentData } from "@/lib/server/dashboards";
import { canAdvance, DIAGNOSTIC_QUESTION_COUNT } from "@/lib/learning/engine";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeading, EmptyState } from "@/components/shared";
import { ConnectionActions } from "@/components/connection-actions";
import { ConnectTeacherForm } from "@/components/connect-teacher";
import { ConnectionRefresh } from "@/components/connection-refresh";

export function StudentDashboard({ profile, data, currentTopic }: { profile: Profile; data: StudentData; currentTopic?: string }) {
  const enrolled = data.enrollments.map(enrollment => {
    const course = data.courses.find(c => c.id === enrollment.course_id);
    const concepts = data.concepts.filter(c => c.course_id === course?.id);
    const mastered = data.mastery.filter(m => m.enrollment_id === enrollment.id && canAdvance(m, data.misconceptions)).length;
    const percent = concepts.length ? (enrollment.status === "diagnostic" ? enrollment.diagnostic_count / DIAGNOSTIC_QUESTION_COUNT * 100 : mastered / concepts.length * 100) : 0;
    return { enrollment, course, concepts: concepts.length, mastered, percent };
  }).filter(item => item.course);
  const ongoing = enrolled.filter(item => item.enrollment.status !== "completed");
  const completed = enrolled.filter(item => item.enrollment.status === "completed");
  const requests = data.connections;
  return <>
    <PageHeading title={`Hello, ${profile.display_name.trim().split(/\s+/)[0]}.`} description="Your learning, your courses, and the teachers you have approved." action={<div className="flex flex-wrap gap-2"><Badge tone="teal">{profile.grade ?? "Student"}</Badge><Badge tone="blue">Student ID: {profile.student_code}</Badge></div>} />
    <section aria-label="Ongoing courses" className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Ongoing courses</h2>
      {ongoing.length ? <div className="grid gap-4 md:grid-cols-2">{ongoing.map(({ enrollment, course, concepts, mastered, percent }) => <Card key={enrollment.id} className="flex flex-col p-5">
        <p className="text-xs text-muted-foreground">{course!.grade} · {course!.subject}</p>
        <CardTitle className="mt-1">{course!.title}</CardTitle>
        <p className="mt-2 flex-1 text-sm text-muted-foreground">{currentTopic && ongoing.length === 1 ? currentTopic : enrollment.status === "diagnostic" ? `Diagnostic in progress · ${enrollment.diagnostic_count} answered` : `${mastered} of ${concepts} concepts mastered`}</p>
        <div className="mt-4"><Progress value={percent} label={`${course!.title} progress`} /></div>
        <Button asChild className="mt-4 w-full sm:w-fit"><Link href={`/learn/${enrollment.id}`}>Continue learning<ArrowRight /></Link></Button>
      </Card>)}</div> : <Card><EmptyState icon={CheckCircle2} title={completed.length ? "All current courses finished" : "Choose your first course"} description={completed.length ? "Pick another subject from Courses, or revise a completed course from your progress." : "Browse Class 10, 11 or 12 courses. Every course begins with a short diagnostic."} href="/courses" label="Browse courses" /></Card>}
    </section>
    {completed.length > 0 && <section aria-label="Completed courses" className="mt-8 space-y-4"><h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Completed courses</h2><div className="grid gap-4 md:grid-cols-2">{completed.map(({ enrollment, course, concepts, mastered, percent }) => <Card key={enrollment.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{course!.grade} · {course!.subject}</p><CardTitle className="mt-1">{course!.title}</CardTitle></div><Badge tone="teal">Completed</Badge></div><p className="mt-2 text-sm text-muted-foreground">{mastered} of {concepts} concepts mastered</p><div className="mt-3"><Progress value={percent} label={`${course!.title} final mastery`} /></div></Card>)}</div></section>}
    <section aria-label="Teacher connections" className="mt-8 grid items-start gap-6 lg:grid-cols-2">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>Teacher connections</CardTitle><ConnectionRefresh /></div>
        {requests.length ? <div className="mt-4 space-y-5">{requests.map(connection => <div key={connection.id} className="border-b pb-4 last:border-0 last:pb-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="font-medium">{connection.teacher_name ?? "Teacher"}</p><p className="text-xs text-muted-foreground">{connection.status === "approved" ? "Connected — you can disconnect at any time" : connection.status === "pending_teacher" ? "Waiting for the teacher to accept" : connection.status === "pending_student" ? "Waiting for you to accept or reject" : connection.status === "rejected" ? "Request rejected — you can send a new request" : "Connection removed — you can send a new request"}</p></div>
            <Badge tone={connection.status === "approved" ? "teal" : connection.status.startsWith("pending") ? "amber" : "neutral"}>{connection.status === "approved" ? "Connected" : connection.status === "pending_teacher" ? "Request sent" : connection.status === "pending_student" ? "Awaiting you" : connection.status === "rejected" ? "Rejected" : "Disconnected"}</Badge>
          </div>
          <ConnectionActions connection={connection} />
        </div>)}</div> : <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-muted-foreground"><Users aria-hidden="true" className="mt-0.5 size-4 shrink-0" />No teacher connections yet. Send a request using a Teacher ID, or wait for an invitation.</p>}
      </Card>
      <Card className="p-5"><ConnectTeacherForm /></Card>
    </section>
  </>;
}
