"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, UserPlus, X } from "lucide-react";
import type { Connection } from "@/lib/types";
import { api, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Notice } from "@/components/shared";

export function TeacherConnectForm() {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setMessage("");
    const code = String(new FormData(event.currentTarget).get("student_code") ?? "");
    try { const result = await api<{ message: string }>("invite", { student_code: code }); setMessage(result.message); }
    catch (e) { setError(errorMessage(e)); }
    finally { setPending(false); router.refresh(); }
  }
  return <form onSubmit={submit} className="space-y-3">
    <Label htmlFor="student-code">Connect using a Student ID</Label>
    <div className="flex flex-col gap-2 sm:flex-row"><Input id="student-code" name="student_code" placeholder="TH-1234AB5678" className="font-mono uppercase" autoCapitalize="characters" autoCorrect="off" spellCheck={false} pattern="[Tt][Hh]-[a-fA-F0-9]{10}" required maxLength={13} disabled={pending} /><Button type="submit" variant="outline" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <UserPlus />}Send request</Button></div>
    <p className="text-xs leading-6 text-muted-foreground">The student can accept or reject. Once accepted, they can see your published courses and you can view their learning progress.</p>
    {error && <Notice error>{error}</Notice>}{message && <Notice>{message}</Notice>}
  </form>;
}

export function TeacherRequestActions({ connection }: { connection: Connection }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function act(action: "accept" | "reject") {
    setPending(true); setError("");
    try { await api(`teacher-connections/${connection.id}`, { action }); }
    catch (e) { setError(errorMessage(e)); }
    finally { setPending(false); router.refresh(); }
  }
  if (connection.status !== "pending_teacher") return null;
  return <div className="mt-3 flex flex-wrap items-center gap-2"><Button size="sm" disabled={pending} onClick={() => act("accept")}>{pending ? <LoaderCircle className="animate-spin" /> : <Check />}Accept</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => act("reject")}><X />Reject</Button>{error && <Notice error>{error}</Notice>}</div>;
}
