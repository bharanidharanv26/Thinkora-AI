import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo, Notice } from "@/components/shared";
import { GoogleLogin } from "@/components/auth-forms";
import { Card } from "@/components/ui/card";
import { publicConfigured } from "@/lib/env";
import { identity, profileFor } from "@/lib/server/auth";
import { destinationForProfile } from "@/lib/auth-flow";
import { HttpError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string; error_code?: string }> }) {
  const configured = publicConfigured();
  let destination: string | null = null;
  let setupIssue = false;
  if (configured) {
    try { const user = await identity(); destination = destinationForProfile(await profileFor(user.id)); }
    catch (error) { if (error instanceof HttpError && error.status === 503) setupIssue = true; }
  }
  if (destination) redirect(destination);
  const params = await searchParams;
  return <div className="flex min-h-dvh flex-col">
    <header className="safe-header border-b bg-white"><div className="safe-inline mx-auto max-w-5xl py-5"><Logo small /></div></header>
    <main id="main" className="safe-main mx-auto flex w-full max-w-md flex-1 items-center py-12 sm:py-16">
      <Card className="w-full p-6 sm:p-8">
        <p className="text-sm font-medium text-primary">Your personal exam-prep tutor</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight">Think Deeper.<br />Learn Smarter.</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">Learn at your own pace, explain your thinking, and revise what needs practice.</p>
        <div className="mt-7"><GoogleLogin configured={configured} autoRetry={params.error_code === "bad_oauth_state"} /></div>
        <p className="mt-4 text-center text-xs leading-6 text-muted-foreground">For students and teachers. New here? Complete your profile after signing in.</p>
        {!configured && <Notice className="mt-5">Connect Supabase to enable sign-in. <Link className="font-medium underline" href="/setup">View setup instructions</Link>.</Notice>}
        {(setupIssue || params.error === "setup") ? <Notice error className="mt-5">Your account could not be loaded. Check the database setup and server credentials, then try again. <Link className="font-medium underline" href="/setup">View setup instructions</Link>.</Notice> : params.error === "denied" ? <Notice error className="mt-5">Google sign-in was cancelled. You can try again when you are ready.</Notice> : params.error_code === "bad_oauth_state" ? <Notice error className="mt-5">Your Google sign-in expired before it finished. Trying again with a fresh sign-in…</Notice> : params.error ? <Notice error className="mt-5">Google sign-in could not be completed. Please try again.</Notice> : null}
      </Card>
    </main>
    <footer className="safe-inline safe-bottom mx-auto flex w-full max-w-5xl justify-center gap-6 py-4 text-xs text-muted-foreground"><Link href="/privacy" className="inline-flex min-h-11 items-center">Privacy</Link><Link href="/setup" className="inline-flex min-h-11 items-center">Installation setup</Link></footer>
  </div>;
}
