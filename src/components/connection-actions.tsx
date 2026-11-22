"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, X } from "lucide-react";
import type { Connection } from "@/lib/types";
import { api, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/shared";
export function ConnectionActions({ connection }: { connection: Connection }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function act(action: "accept" | "reject" | "revoke") {
    setPending(true); setError(""); setMessage("");
    try { const result = await api<{ message: string }>(`connections/${connection.id}`, { action }); setMessage(result.message); }
    catch (e) { setError(errorMessage(e)); }
    finally { setPending(false); router.refresh(); }
  }
  return <div className="mt-4 space-y-3">
    {connection.status === "pending_teacher" && <>
      <p className="text-xs leading-6 text-muted-foreground">Waiting for the teacher to accept or reject. Acceptance gives you access to their published courses and lets them view your progress.</p>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => act("revoke")}>Withdraw request</Button>
    </>}
    {connection.status === "pending_student" && <>
      <p className="text-xs leading-6 text-muted-foreground">Accept to see this teacher’s published courses and share your learning progress, answers, reasoning and misconceptions. You can disconnect at any time.</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => act("accept")}>{pending ? <LoaderCircle className="animate-spin" /> : <Check />}Accept</Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => act("reject")}><X />Reject</Button>
      </div>
    </>}
    {connection.status === "approved" && <>
      <p className="text-xs leading-6 text-muted-foreground">Their published courses are available in Courses. This teacher can now view your learning progress.</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" asChild><Link href="/courses">Browse courses</Link></Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => act("revoke")}>Disconnect</Button>
      </div>
    </>}
    {message && <Notice>{message}</Notice>}{error && <Notice error>{error}</Notice>}
  </div>;
}
