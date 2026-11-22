"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, ArrowRight, Check, Upload, Send, Trash2 } from "lucide-react";
import type { Course, Mode, Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea, Input } from "@/components/ui/input";
import { Notice } from "@/components/shared";
import { api, errorMessage } from "@/lib/api-client";
import { CLASS_OPTIONS, OTHER_OPTION, SUBJECT_OPTIONS } from "@/lib/course-options";
import { browserSupabase } from "@/lib/supabase/client";
import { MAX_SYLLABUS_BYTES, syllabusFormat, type SignedSyllabusUpload } from "@/lib/syllabus-files";

export function DeleteCourseButton({ courseId, redirectTo, compact = false }: { courseId: string; redirectTo?: string; compact?: boolean }) {
  const router = useRouter(); const [confirming, setConfirming] = useState(false); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function remove() {
    setPending(true); setError("");
    try { await api(`courses/${courseId}/delete`, {}); if (redirectTo) router.push(redirectTo); router.refresh(); }
    catch (e) { setError(errorMessage(e)); setPending(false); }
  }
  if (!confirming) return <Button type="button" variant="ghost" size={compact ? "sm" : "default"} className="w-full" onClick={() => setConfirming(true)} disabled={pending}><Trash2 />Delete course</Button>;
  return <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-xs leading-5 text-red-800">Delete this course? Its learning records stay saved but the course and its content will no longer be visible.</p>{error && <Notice error>{error}</Notice>}<div className="flex flex-wrap gap-2"><Button type="button" variant="destructive" size="sm" onClick={remove} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}{pending ? "Deleting…" : "Yes, delete"}</Button><Button type="button" variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={pending}>Cancel</Button></div></div>;
}

export function TeacherCourseActions({ course }: { course: Course }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function publish() {
    setPending(true); setError("");
    try { await api(`courses/${course.id}/publish`, {}); router.refresh(); }
    catch (e) { setError(errorMessage(e)); setPending(false); }
  }
  return <div className="space-y-4">
    <p className="text-sm leading-6 text-muted-foreground">{course.status === "published" ? "Published. Connected students can now find this course in their Courses page." : "This draft is visible only to you. Review the concepts, then publish it when it is ready."}</p>
    {course.status === "draft" && <Button className="w-full" onClick={publish} disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Send />}{pending ? "Publishing…" : "Publish to connected students"}</Button>}
    {error && <Notice error>{error}</Notice>}
    <DeleteCourseButton courseId={course.id} redirectTo="/courses" />
  </div>;
}

export function CourseActions({ course, enrollmentId }: { course: Course; enrollmentId?: string }) {
  const router = useRouter(); const [mode, setMode] = useState<Mode>("scratch"); const [pending, setPending] = useState(false); const [error, setError] = useState(""); const [reviewed, setReviewed] = useState(false);
  async function start() {
    setPending(true); setError("");
    try {
      if (enrollmentId) { router.push(`/learn/${enrollmentId}`); return; }
      if (course.status === "draft") { await api(`courses/${course.id}/approve`, {}); }
      const result = await api<{ id: string }>("enroll", { course_id: course.id, mode });
      router.push(`/learn/${result.id}`); router.refresh();
    } catch (e) { setError(errorMessage(e)); setPending(false); }
  }
  return <div className="space-y-4">{!enrollmentId && <><div><Label htmlFor="mode">Choose your starting level</Label><Select id="mode" value={mode} onChange={e => setMode(e.target.value as Mode)} disabled={pending}><option value="scratch">Beginner — teach me from the basics</option><option value="prior">Intermediate — I know some concepts</option></Select><p className="mt-2 text-xs leading-5 text-muted-foreground">Both levels start with 3 quick questions. Your answers decide where teaching begins, and every later answer keeps adjusting your mastery. You can switch levels without losing progress.</p></div>{course.status === "draft" && <label className="flex items-start gap-3 rounded-lg border p-3 text-sm leading-6"><input type="checkbox" className="mt-1 size-4 accent-teal-700" checked={reviewed} onChange={e => setReviewed(e.target.checked)} required /><span>I have reviewed the topics, explanations and prerequisites. This syllabus matches what I want to learn.</span></label>}</>}{error && <Notice error>{error}</Notice>}<Button className="w-full" onClick={start} disabled={pending || (course.status === "draft" && !reviewed)}>{pending ? <LoaderCircle className="animate-spin" /> : course.status === "draft" ? <Check /> : <ArrowRight />}{pending ? "Saving your course…" : enrollmentId ? "Resume saved lesson" : course.status === "draft" ? "Approve & start diagnostic" : "Start initial diagnostic"}</Button></div>;
}

export function SyllabusUpload({ role, defaultGrade }: { role: Role; defaultGrade?: string | null }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState(""); const [fileName, setFileName] = useState("");
  const [stage, setStage] = useState("Building your course…");
  const [gradeChoice, setGradeChoice] = useState(defaultGrade && CLASS_OPTIONS.includes(defaultGrade as typeof CLASS_OPTIONS[number]) ? defaultGrade : "Class 10");
  const [subjectChoice, setSubjectChoice] = useState("Physics");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); const form = new FormData(event.currentTarget); const file = form.get("file");
    if (file instanceof File && file.size > MAX_SYLLABUS_BYTES) { setError("Choose a file up to 10 MB."); return; }
    if (file instanceof File && file.size && !syllabusFormat(file.name)) { setError("Supported files: PDF, PNG, JPEG, WebP, DOCX and TXT."); return; }
    if (!(file instanceof File && file.size) && !String(form.get("text") ?? "").trim()) { setError("Upload a file or enter a topic. One or two words are enough."); return; }
    setPending(true);
    try {
      let ticket: string | undefined;
      if (file instanceof File && file.size) {
        setStage("Uploading your file…");
        const signed = await api<SignedSyllabusUpload>("courses/upload-url", { name: file.name, size: file.size });
        const typed = file.type === signed.contentType ? file : new File([file], file.name, { type: signed.contentType });
        const { error: uploadError } = await browserSupabase().storage.from("syllabuses").uploadToSignedUrl(signed.path, signed.token, typed, { contentType: signed.contentType });
        if (uploadError) throw new Error("Your file could not be uploaded. Check your connection and try again.");
        ticket = signed.ticket;
      }
      setStage("Building your course…");
      const result = await api<{ id: string }>("courses/upload", { grade: String(form.get("grade") ?? ""), subject: String(form.get("subject") ?? ""), text: String(form.get("text") ?? ""), ticket });
      router.push(`/courses/${result.id}`); router.refresh();
    }
    catch (e) { setError(errorMessage(e)); setPending(false); }
  }
  return <form onSubmit={submit} className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2">
      <div><Label htmlFor="course-grade">Class</Label><Select id="course-grade" name={gradeChoice === OTHER_OPTION ? "grade-custom" : "grade"} value={gradeChoice} onChange={e => setGradeChoice(e.target.value)} disabled={pending}>{CLASS_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}<option value={OTHER_OPTION}>Other</option></Select>{gradeChoice === OTHER_OPTION && <Input name="grade" className="mt-2" maxLength={60} placeholder="Class or learning level" required disabled={pending} />}</div>
      <div><Label htmlFor="course-subject">Subject</Label><Select id="course-subject" name={subjectChoice === OTHER_OPTION ? "subject-custom" : "subject"} value={subjectChoice} onChange={e => setSubjectChoice(e.target.value)} disabled={pending}>{SUBJECT_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}<option value={OTHER_OPTION}>Other</option></Select>{subjectChoice === OTHER_OPTION && <Input name="subject" className="mt-2" maxLength={80} placeholder="Subject name" required disabled={pending} />}</div>
    </div>
    <div className="rounded-xl border-2 border-dashed bg-slate-50 p-6 text-center"><Upload className="mx-auto mb-3 size-7 text-primary" /><Label htmlFor="syllabus-file">Upload your syllabus</Label><p className="mb-4 text-xs leading-5 text-muted-foreground">PDF, photo, WebP, DOCX or TXT · Maximum 10 MB</p><Input id="syllabus-file" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.txt" disabled={pending} className="mx-auto max-w-md bg-white file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm" onChange={e => setFileName(e.target.files?.[0]?.name ?? "")} />{fileName && <p className="mt-3 break-all text-xs text-primary">Selected: {fileName}</p>}</div>
    <div><Label htmlFor="syllabus-text">Or type a topic or paste your syllabus</Label><Textarea id="syllabus-text" name="text" rows={8} maxLength={30000} disabled={pending} aria-describedby="syllabus-text-help" placeholder="Paste your syllabus, or type a chapter or topic you want to learn." /><p id="syllabus-text-help" className="mt-2 text-xs leading-5 text-muted-foreground">The class and subject above guide the AI. Add more chapters for a broader course. Do not include personal information.</p></div>
    {error && <Notice error>{error}</Notice>}{pending && <Notice>{stage} Organizing topics and independently checking the content can take a couple of minutes. Keep this page open.</Notice>}<Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}{pending ? stage : role === "teacher" ? "Create course draft" : "Create my private course"}</Button><p className="text-xs leading-6 text-muted-foreground">Your upload is private. Its content is sent to the AI provider to extract and validate the syllabus. {role === "teacher" ? "Students see the course only after you publish it." : "Only you can see this course."}</p>
  </form>;
}
