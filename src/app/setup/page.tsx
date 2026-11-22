import Link from "next/link";
import { Logo, PageHeading } from "@/components/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { appUrl, publicConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function Setup() {
  const production = process.env.NODE_ENV === "production";
  const origin = new URL(appUrl()).origin;
  const checks = [
    { name: "Supabase public configuration", configured: publicConfigured() },
    { name: "Supabase server credential", configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() },
    { name: "Gemini API credential", configured: !!process.env.GEMINI_API_KEY?.trim() && !!process.env.GEMINI_MODEL?.trim() },
  ];

  return <main id="main" className="safe-main mx-auto max-w-3xl py-10">
    <Logo />
    <div className="mt-10"><PageHeading title="Connect your services" description="The application is installed. Configure these services to enable real authentication, stored progress and AI learning." /></div>
    <Card>
      <CardHeader><CardTitle>Configuration presence</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {checks.map(check => <div key={check.name} className="flex items-center justify-between gap-3 border-b pb-3 text-sm">
          <span>{check.name}</span>
          <Badge tone={check.configured ? "teal" : "amber"}>{check.configured ? "Present" : "Required"}</Badge>
        </div>)}
        <p className="text-xs leading-5 text-muted-foreground">Presence does not verify that credentials are valid or that a service is reachable. Secret values are never displayed.</p>
      </CardContent>
    </Card>
    <Card className="mt-5">
      <CardHeader><CardTitle>{production ? "Production setup" : "Local setup"}</CardTitle></CardHeader>
      <CardContent>
        <ol className="list-decimal space-y-4 pl-5 text-sm leading-7">
          <li>{production
            ? <>In Vercel, open this project’s <strong>Settings → Environment Variables</strong> and select <strong>Production</strong>. Configure the variables below, then redeploy.</>
            : <>Copy <code>.env.example</code> to <code>.env.local</code> and configure the variables below.</>}
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Supabase: <code className="break-all">NEXT_PUBLIC_SUPABASE_URL</code>, <code className="break-all">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and <code className="break-all">SUPABASE_SERVICE_ROLE_KEY</code>.</li>
              <li>Google AI Studio: <code>GEMINI_API_KEY</code> and <code>GEMINI_MODEL</code>.</li>
              <li>Application origin: <code className="break-all">NEXT_PUBLIC_APP_URL={origin}</code>.</li>
            </ul>
          </li>
          <li>Apply every SQL file in <code>supabase/migrations/</code> in filename order, then <code>supabase/seed.sql</code>, using the Supabase SQL editor or CLI. The migrations create the private <code>syllabuses</code> storage bucket (10 MB limit) used for direct uploads; keep that bucket private.</li>
          <li>Enable Google in Supabase Authentication. Under <strong>URL Configuration</strong>, set <strong>Site URL</strong> to <code className="break-all">{origin}</code> and add <code className="break-all">{origin}/auth/callback</code> to <strong>Redirect URLs</strong>. Save both settings. These are configured separately from Vercel.</li>
          <li>To let users outside your Google test-user list sign in, set the Google OAuth app’s audience to <strong>External</strong> and publish it to <strong>Production</strong>, completing any verification Google requires. See <code>README.md</code> for the provider callback configuration.</li>
          <li>{production
            ? <>Redeploy after changing Vercel environment variables. Then open <a href={origin} className="break-all font-semibold text-primary">{origin}</a> in a private browser window and start a fresh Google sign-in.</>
            : <>Restart with <code>npm run dev</code>, then sign in.</>}
          </li>
        </ol>
        <Link href="/" className="mt-6 inline-block font-semibold text-primary">Return to sign in →</Link>
      </CardContent>
    </Card>
  </main>;
}
