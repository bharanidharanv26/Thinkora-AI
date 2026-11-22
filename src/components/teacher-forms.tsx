"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, UserPlus } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Notice } from "@/components/shared";
export function CreateClassForm() {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const element = event.currentTarget; const form = new FormData(element); setPending(true); setError("");
    try { await api("classes", { name: form.get("name"), subject: form.get("subject") }); element.reset(); router.refresh(); }
    catch (e) { setError(errorMessage(e)); } finally { setPending(false); }
  }
  return <form onSubmit={submit} className="space-y-4"><div><Label htmlFor="class-name">Class name</Label><Input id="class-name" name="name" placeholder="e.g. Class 10 — Section A" minLength={2} maxLength={100} required /></div><div><Label htmlFor="class-subject">Subject</Label><Input id="class-subject" name="subject" placeholder="e.g. Physics" minLength={2} maxLength={100} required /></div>{error && <Notice error>{error}</Notice>}<Button disabled={pending} type="submit">{pending ? <LoaderCircle className="animate-spin" /> : <Plus />}Create class</Button></form>;
}
export function InviteStudentForm({ classId }: { classId: string }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setPending(true); setError(""); setMessage("");
    try { const result = await api<{ message: string }>("invite", { class_id: classId, student_code: form.get("student_code") }); setMessage(result.message); router.refresh(); }
    catch (e) { setError(errorMessage(e)); } finally { setPending(false); }
  }
  return <form onSubmit={submit} className="space-y-3"><Label htmlFor={`student-${classId}`}>Connect using a Student ID</Label><div className="flex flex-col gap-2 sm:flex-row"><Input id={`student-${classId}`} name="student_code" placeholder="TH-1234AB5678" className="font-mono uppercase" autoCapitalize="characters" autoCorrect="off" spellCheck={false} pattern="[Tt][Hh]-[a-fA-F0-9]{10}" required maxLength={13} /><Button disabled={pending} type="submit" variant="outline">{pending ? <LoaderCircle className="animate-spin" /> : <UserPlus />}Invite</Button></div><p className="text-xs leading-6 text-muted-foreground">The student can accept or reject. Acceptance shares your published courses with them and gives you access to their learning progress.</p>{error && <Notice error>{error}</Notice>}{message && <Notice>{message}</Notice>}</form>;
}
