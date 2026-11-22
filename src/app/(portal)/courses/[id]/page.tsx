import { notFound } from "next/navigation";
import { pageProfile } from "@/lib/server/auth";
import { readableCourse } from "@/lib/server/data";
import { admin } from "@/lib/supabase/server";
import { idSchema, HttpError } from "@/lib/server/http";
import { PageHeading } from "@/components/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CourseActions, DeleteCourseButton, TeacherCourseActions } from "@/components/course-actions";
import { ConceptGraph } from "@/components/concept-graph";
export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await pageProfile(); const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  let content;
  try { content = await readableCourse(id, profile); } catch (e) { if (e instanceof HttpError && e.status === 404) notFound(); throw e; }
  const { course, concepts, prerequisites } = content;
  const { data: enrollment } = profile.role === "student"
    ? await admin().from("enrollments").select("id").eq("student_id", profile.id).eq("course_id", id).maybeSingle()
    : { data: null };
  const teacher = profile.role === "teacher";
  const badge = teacher
    ? course.status === "draft" ? { text: "Draft · only you can see this", tone: "amber" as const } : { text: "Published to connected students", tone: "teal" as const }
    : course.course_kind === "predefined" ? { text: "Complete learning course", tone: "teal" as const }
    : course.course_kind === "teacher" ? { text: "Shared by your teacher", tone: "blue" as const }
    : course.status === "draft" ? { text: "Awaiting your review", tone: "amber" as const } : { text: "Your private course", tone: "blue" as const };
  return <><PageHeading eyebrow={`${course.grade} · ${course.subject}`} title={course.title} description={course.description} /><div className="grid items-start gap-6 lg:grid-cols-[1.7fr_1fr]"><div className="space-y-6"><Card><CardHeader><CardTitle>How the concepts connect</CardTitle></CardHeader><CardContent><ConceptGraph concepts={concepts} prerequisites={prerequisites} /></CardContent></Card><Card><CardHeader><CardTitle>{course.status === "draft" ? "Review the extracted syllabus" : "What you’ll understand"}</CardTitle><p className="text-xs leading-5 text-muted-foreground">Open each concept to review its teaching content, worked examples and prerequisites.</p></CardHeader><CardContent className="space-y-2">{concepts.map((c, index) => <details key={c.id} className="rounded-lg border"><summary className="flex list-none items-center gap-3 p-4"><span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">{index + 1}</span><span className="flex-1 text-sm font-semibold">{c.title}</span><span className="text-muted-foreground">+</span></summary><div className="space-y-4 border-t p-4 text-sm leading-7"><p className="prose-copy">{c.content.explanation}</p>{c.content.examples.map((e, n) => <div key={n} className="rounded-lg bg-muted p-4"><p className="font-semibold">{e.problem}</p><p className="mt-2 prose-copy text-muted-foreground">{e.solution}</p></div>)}<p className="text-xs text-muted-foreground">Prerequisites: {prerequisites.filter(p => p.concept_id === c.id).map(p => concepts.find(c => c.id === p.prerequisite_id)?.title).join(", ") || "Start here — no prior concepts required"}</p></div></details>)}</CardContent></Card></div><aside><Card><CardHeader><Badge className="self-start" tone={badge.tone}>{badge.text}</Badge><CardTitle className="mt-2">{concepts.length} concepts. {teacher ? "Flexible teaching." : "Your own pace."}</CardTitle></CardHeader><CardContent>{teacher ? <TeacherCourseActions course={course} /> : <><ul className="mb-6 space-y-3 text-sm leading-6 text-muted-foreground"><li>✓ A quick 3-question starting check</li><li>✓ Teaching that responds to your reasoning</li><li>✓ Saved progress and spaced revision</li></ul><CourseActions course={course} enrollmentId={enrollment?.id} />{course.course_kind === "student" && course.owner_id === profile.id && <div className="mt-2"><DeleteCourseButton courseId={course.id} redirectTo="/courses" /></div>}</>}</CardContent></Card></aside></div></>;
}
