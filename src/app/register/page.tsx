import { redirect } from "next/navigation";
import { identity, profileFor } from "@/lib/server/auth";
import { destinationForProfile } from "@/lib/auth-flow";
import { HttpError } from "@/lib/server/http";
import type { Profile } from "@/lib/types";
import { Logo } from "@/components/shared";
import { RegistrationForm } from "@/components/auth-forms";
import { Card, CardHeader, CardDescription, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function Register() {
  let user;
  try { user = await identity(); } catch { redirect("/"); }
  let profile: Profile | null = null;
  try { profile = await profileFor(user.id); }
  catch (error) {
    if (error instanceof HttpError && error.status === 503) redirect("/?error=setup");
    throw error;
  }
  if (profile) redirect(destinationForProfile(profile));
  return <main id="main" className="safe-main mx-auto max-w-lg py-8 sm:py-12"><div className="mb-7 flex justify-center"><Logo small /></div><Card><CardHeader><h1 className="text-2xl font-semibold tracking-tight">Create your profile</h1><CardDescription>A few details to get you started.</CardDescription></CardHeader><CardContent><RegistrationForm name={String(user.user_metadata.full_name || "").slice(0, 100)} /></CardContent></Card><form action="/auth/logout" method="post" className="mt-4 text-center"><button className="min-h-11 text-sm text-muted-foreground">Use a different Google account</button></form></main>;
}
