"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, UserPlus } from "lucide-react";
import { api, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Notice } from "@/components/shared";

export function ConnectTeacherForm() {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(""); setMessage("");
    const code = String(new FormData(event.currentTarget).get("teacher_code") ?? "");
    try { const result = await api<{ message: string }>("connect", { teacher_code: code }); setMessage(result.message); }
    catch (e) { setError(errorMessage(e)); }
    finally { setPending(false); router.refresh(); }
  }
  return <form onSubmit={submit} className="space-y-3">
    <Label htmlFor="teacher-code">Connect with a teacher</Label>
    <div className="flex flex-col gap-2 sm:flex-row"><Input id="teacher-code" name="teacher_code" placeholder="THT-1234AB5678" className="font-mono uppercase" autoCapitalize="characters" autoCorrect="off" spellCheck={false} pattern="[Tt][Hh][Tt]-[a-fA-F0-9]{10}" required maxLength={14} disabled={pending} /><Button type="submit" variant="outline" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <UserPlus />}Send request</Button></div>
    <p className="text-xs leading-6 text-muted-foreground">The teacher can accept or reject. Once accepted, you can see their published courses and they can view your learning progress. You can disconnect at any time.</p>
    {error && <Notice error>{error}</Notice>}{message && <Notice>{message}</Notice>}
  </form>;
}
