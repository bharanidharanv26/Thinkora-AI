import Link from "next/link";
import { Logo, PageHeading } from "@/components/shared";
import { Card } from "@/components/ui/card";

export default function RetiredGuardianConsent() {
  return <main id="main" className="safe-main mx-auto max-w-2xl py-10">
    <Logo />
    <div className="mt-10"><PageHeading title="Connections are now accepted in the app" description="Students and teachers can send requests using each other’s IDs. The recipient accepts or rejects the request." /></div>
    <Card className="space-y-4 p-6 text-sm leading-7">
      <p>This email link is no longer needed. Sign in to check the connection’s current status.</p>
      <Link href="/" className="font-semibold text-primary">Go to Thinkora AI →</Link>
    </Card>
  </main>;
}
