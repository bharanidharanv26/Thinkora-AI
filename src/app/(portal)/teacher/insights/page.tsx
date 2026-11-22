import Link from "next/link";
import { Lightbulb, ChartNoAxesCombined } from "lucide-react";
import { pageProfile } from "@/lib/server/auth";
import { teacherData } from "@/lib/server/dashboards";
import { PageHeading, EmptyState } from "@/components/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { percent } from "@/lib/utils";

export default async function InsightsPage() {
  const profile = await pageProfile("teacher");
  const data = await teacherData(profile.id);
  const gaps = new Map<string, { title: string; scores: number[]; students: Set<string> }>();
  const misconceptions = new Map<string, { description: string; concept: string; students: Set<string> }>();
  for (const student of data.students) {
    for (const concept of student.records.concepts) {
      const mastery = student.records.mastery.find(m => m.concept_id === concept.id);
      const entry = gaps.get(concept.id) ?? { title: concept.title, scores: [], students: new Set<string>() };
      if (mastery) { entry.scores.push(mastery.score); if (mastery.score < 0.5) entry.students.add(student.id); }
      gaps.set(concept.id, entry);
    }
    for (const misconception of student.records.misconceptions.filter(m => m.status === "active")) {
      const key = `${misconception.concept_id}-${misconception.key}`;
      const entry = misconceptions.get(key) ?? { description: misconception.description, concept: student.records.concepts.find(c => c.id === misconception.concept_id)?.title ?? "Concept", students: new Set<string>() };
      entry.students.add(student.id); misconceptions.set(key, entry);
    }
  }
  const weakest = [...gaps.entries()].map(([id, gap]) => ({ id, ...gap, average: gap.scores.length ? gap.scores.reduce((a, b) => a + b, 0) / gap.scores.length : null })).filter(gap => gap.students.size || gap.average !== null).sort((a, b) => (a.average ?? 1) - (b.average ?? 1)).slice(0, 8);
  const common = [...misconceptions.values()].sort((a, b) => b.students.size - a.students.size).slice(0, 8);
  if (!data.students.length) return <><PageHeading title="Student progress" description="Concept gaps and misconceptions appear once students approve monitoring." /><Card><EmptyState icon={ChartNoAxesCombined} title="No class data yet" description="Connect students with their Student IDs to see shared weaknesses and misconceptions here." href="/teacher/students" label="Connect students" /></Card></>;
  return <>
    <PageHeading title="Student progress" description={`Individual progress and shared weaknesses across ${data.students.length} connected student${data.students.length === 1 ? "" : "s"}.`} />
    <Card className="mb-6"><CardHeader><CardTitle>Connected students</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">{data.students.map(student => <Link key={student.id} href={`/teacher/students/${student.id}`} className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"><span className="font-medium">{student.display_name}</span><span className="ml-2 text-xs text-muted-foreground">{percent(student.average)} mastery</span></Link>)}</CardContent></Card>
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card><CardHeader><CardTitle>Weakest concepts</CardTitle><p className="text-xs leading-5 text-muted-foreground">Lowest average mastery first; the count shows students below 50%.</p></CardHeader><CardContent className="space-y-4">{weakest.length ? weakest.map(gap => <div key={gap.id}><div className="mb-1 flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium">{gap.title}</span><Badge tone={gap.students.size ? "amber" : "neutral"}>{gap.students.size ? `${gap.students.size} struggling` : "unassessed"}</Badge></div><Progress value={(gap.average ?? 0) * 100} label={`${gap.title} average mastery`} /><p className="mt-1 text-xs text-muted-foreground">Average mastery {gap.average === null ? "not yet assessed" : percent(gap.average)}</p></div>) : <p className="text-sm text-muted-foreground">No concept evidence recorded yet.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Common misconceptions</CardTitle><p className="text-xs leading-5 text-muted-foreground">Observed in written reasoning, grouped by concept.</p></CardHeader><CardContent className="space-y-4">{common.length ? common.map((item, index) => <div key={index} className="border-b pb-3 last:border-0 last:pb-0"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{item.concept}</p><Badge tone="amber">{item.students.size} student{item.students.size === 1 ? "" : "s"}</Badge></div><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p></div>) : <p className="flex items-start gap-2 text-sm text-muted-foreground"><Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0" />No active misconceptions recorded yet.</p>}</CardContent></Card>
    </div>
    <p className="mt-6 text-xs leading-6 text-muted-foreground">Only students who approved monitoring are included. Open a student from <Link href="/teacher/students" className="font-semibold text-primary">Students</Link> for individual records.</p>
  </>;
}
