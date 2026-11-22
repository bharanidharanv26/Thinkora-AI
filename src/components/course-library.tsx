"use client";
import Link from "next/link";
import { useState } from "react";
import { Search, ArrowRight, BookOpen, Lightbulb } from "lucide-react";
import type { StudentData } from "@/lib/server/dashboards";
import type { Role } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared";
import { DeleteCourseButton } from "@/components/course-actions";

export function CourseLibrary({ data, role, ownerId }: {
  data: Pick<StudentData, "courses" | "concepts" | "enrollments">;
  role: Role;
  ownerId: string;
}) {
  const [search, setSearch] = useState(""); const [grade, setGrade] = useState("all"); const [subject, setSubject] = useState("all");
  const grades = [...new Set(data.courses.map(c => c.grade))].sort();
  const subjects = [...new Set(data.courses.map(c => c.subject))].sort();
  const teacher = role === "teacher";
  const filtering = !!search || grade !== "all" || subject !== "all";
  const filtered = data.courses.filter(c => {
    const text = `${c.title} ${c.grade} ${c.subject} ${data.concepts.filter(t => t.course_id === c.id).map(t => t.title).join(" ")}`.toLowerCase();
    return text.includes(search.toLowerCase()) && (grade === "all" || c.grade === grade) && (subject === "all" || c.subject === subject);
  });
  return <>
    <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr]">
      <div><label htmlFor="course-grade" className="mb-1 block text-xs font-medium text-muted-foreground">Class</label><Select id="course-grade" value={grade} onChange={e => setGrade(e.target.value)}><option value="all">All classes</option>{grades.map(item => <option key={item} value={item}>{item}</option>)}</Select></div>
      <div><label htmlFor="course-subject" className="mb-1 block text-xs font-medium text-muted-foreground">Subject</label><Select id="course-subject" value={subject} onChange={e => setSubject(e.target.value)}><option value="all">All subjects</option>{subjects.map(item => <option key={item} value={item}>{item}</option>)}</Select></div>
      <div><label htmlFor="course-search" className="mb-1 block text-xs font-medium text-muted-foreground">Search</label><div className="relative"><Search className="absolute top-3.5 left-3 size-4 text-muted-foreground" /><Input id="course-search" placeholder="Chapter or topic…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} type="search" /></div></div>
    </div>
    {filtered.length ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{filtered.map(c => {
      const enrollment = data.enrollments.find(e => e.course_id === c.id); const count = data.concepts.filter(t => t.course_id === c.id).length;
      const own = c.owner_id === ownerId && c.course_kind === role;
      const badge = teacher
        ? c.status === "draft" ? { text: "Draft · only you", tone: "amber" as const } : { text: "Published", tone: "teal" as const }
        : c.status === "draft" ? { text: "Review required", tone: "amber" as const }
        : c.course_kind === "teacher" ? { text: "From your teacher", tone: "blue" as const }
        : c.course_kind === "student" ? { text: "Private course", tone: "blue" as const }
        : enrollment ? { text: "Enrolled", tone: "teal" as const } : { text: "Ready to learn", tone: "blue" as const };
      const href = enrollment ? `/learn/${enrollment.id}` : `/courses/${c.id}`;
      const action = teacher
        ? c.status === "draft" ? "Review & publish" : "View course"
        : enrollment ? "Continue learning" : c.status === "draft" ? "Review your syllabus" : "Choose level & start";
      return <Card key={c.id} className="flex flex-col p-5">
        <div className="mb-5 flex items-center justify-between gap-2"><span className="rounded-xl bg-blue-50 p-3 text-blue-600">{c.course_kind === "predefined" ? <Lightbulb className="size-6" /> : <BookOpen className="size-6" />}</span><Badge tone={badge.tone}>{badge.text}</Badge></div>
        <p className="text-xs text-muted-foreground">{c.grade} · {c.subject}</p>
        <h2 className="mt-2 text-xl font-semibold">{c.title}</h2>
        <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{c.description}</p>
        <div className="my-5 flex flex-wrap gap-2 text-xs text-muted-foreground"><span>{count} connected concepts</span><span>·</span><span>Adaptive learning</span></div>
        <Button variant={enrollment ? "default" : "outline"} className="w-full" asChild><Link href={href}>{action}<ArrowRight /></Link></Button>
        {own && <div className="mt-2"><DeleteCourseButton courseId={c.id} compact /></div>}
      </Card>;
    })}</div> : <Card><EmptyState icon={BookOpen} title={filtering ? "No matching courses" : teacher ? "Create your first course" : "Your course collection starts here"} description={filtering ? "Try another class, subject or topic, or create a course from your own syllabus." : teacher ? "Add a class, subject and syllabus. Students see it in their Courses page after you publish it." : "Choose a class and subject, or create a course from your own syllabus."} href="/courses/upload" label={teacher ? "Add course" : "Create my own course"} /></Card>}
    <p className="mt-6 text-xs leading-6 text-muted-foreground">{teacher ? "Only you can see and delete your courses. Publishing makes a course available to students with an approved connection to you." : "Predefined courses are open to everyone. Courses shared by a connected teacher and courses you create are privately scoped to you."}</p>
  </>;
}
