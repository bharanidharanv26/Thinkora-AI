"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, ArrowRight } from "lucide-react";
import { browserSupabase } from "@/lib/supabase/client";
import { api, errorMessage } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Notice } from "@/components/shared";
import { cn } from "@/lib/utils";

const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/^https?:\/\/([^.]+)/)?.[1];
const RETRY_KEY = "thinkora-oauth-retry";

function clearStaleVerifiers() {
  if (!projectRef) return;
  const prefix = `sb-${projectRef}-auth-token`;
  for (const pair of document.cookie.split(";")) {
    const name = pair.split("=")[0]?.trim();
    if (name?.startsWith(prefix) && name.includes("code-verifier")) document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
  }
}

export function GoogleLogin({ configured, autoRetry = false }: { configured: boolean; autoRetry?: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);
  const retried = useRef(false);
  const login = useCallback(async () => {
    if (started.current) return;
    started.current = true;
    clearStaleVerifiers();
    setPending(true); setError("");
    try {
      const { error } = await browserSupabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } } });
      if (error) throw error;
    } catch (error) { started.current = false; setError(errorMessage(error)); setPending(false); }
  }, []);
  useEffect(() => {
    if (!autoRetry || !configured || retried.current) return;
    retried.current = true;
    if (sessionStorage.getItem(RETRY_KEY)) { sessionStorage.removeItem(RETRY_KEY); return; }
    sessionStorage.setItem(RETRY_KEY, "1");
    window.setTimeout(() => { void login(); }, 0);
  }, [autoRetry, configured, login]);
  const manualLogin = () => { sessionStorage.removeItem(RETRY_KEY); void login(); };
  return <div className="space-y-3">
    <Button onClick={manualLogin} disabled={!configured || pending} size="lg" className="w-full">
      {pending ? <LoaderCircle className="animate-spin" /> : <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.4 3-7.5ZM12 22c2.7 0 5-1 6.6-2.3l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3.1v2.6A10 10 0 0 0 12 22ZM6.4 14a6 6 0 0 1 0-4V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14ZM12 5.8c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.9 5.4L6.4 10C7.2 7.6 9.4 5.8 12 5.8Z" /></svg>}
      {pending ? "Connecting to Google…" : "Sign in with Google"}
    </Button>
    {error && <Notice error>{error}</Notice>}
  </div>;
}

export function RegistrationForm({ name }: { name: string }) {
  const router = useRouter();
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [age, setAge] = useState("under18");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true); setError("");
    try {
      const result = await api<{ redirect: string }>("register", { role, display_name: form.get("display_name"), ...(role === "student" ? { grade: form.get("grade"), age_band: age } : { institution: form.get("institution") }) });
      router.push(result.redirect); router.refresh();
    } catch (error) { setError(errorMessage(error)); setPending(false); }
  }
  return <form onSubmit={submit}>
    <fieldset disabled={pending} className="space-y-5">
      <legend className="sr-only">Registration details</legend>
      <fieldset><legend className="mb-2 text-sm font-medium">I am a</legend><div className="grid grid-cols-2 gap-2">
        {(["student", "teacher"] as const).map(value => <button key={value} type="button" aria-pressed={role === value} onClick={() => setRole(value)} className={cn("min-h-11 rounded-lg border px-4 py-3 text-sm font-medium capitalize", role === value ? "border-primary bg-accent text-primary" : "bg-white text-muted-foreground")}>{value}</button>)}
      </div></fieldset>
      <div><Label htmlFor="display_name">Your name</Label><Input id="display_name" name="display_name" defaultValue={name} minLength={2} maxLength={100} autoComplete="name" required /></div>
      {role === "student" ? <>
        <div><Label htmlFor="grade">Class or learning level</Label><Input name="grade" id="grade" placeholder="e.g. Class 10" maxLength={60} required /></div>
        <div><Label htmlFor="age">Age group</Label><Select id="age" value={age} onChange={event => setAge(event.target.value)}><option value="under18">Under 18</option><option value="adult">18 or older</option></Select></div>
      </> : <div><Label htmlFor="institution">School or institution</Label><Input id="institution" name="institution" minLength={2} maxLength={150} required /></div>}
      <p className="text-xs leading-6 text-muted-foreground">{role === "student" ? "Your unique Student ID is created automatically. " : "Students must approve access to their progress. "}Your role is fixed after registration.</p>
      {error && <Notice error>{error}</Notice>}
      <Button type="submit" disabled={pending} className="w-full">{pending ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}{pending ? "Creating your profile…" : "Create profile"}</Button>
    </fieldset>
  </form>;
}
