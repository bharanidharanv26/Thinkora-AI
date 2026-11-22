import Link from "next/link";
import { Logo, PageHeading } from "@/components/shared";
import { Card } from "@/components/ui/card";
export default function Privacy() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return <main id="main" className="safe-main mx-auto max-w-3xl py-10">
    <Logo /><div className="mt-10"><PageHeading title="Your learning data" description="What Thinkora AI stores and how sharing works." /></div>
    <Card className="space-y-5 p-6 text-sm leading-7">
      <section><h2 className="font-semibold">Your account and learning history</h2><p>Google and Supabase authenticate your account. Thinkora stores your profile, approved courses, answers, written reasoning, AI evaluations, misconceptions, mastery and revision dates. Uploaded syllabuses are stored in a private Supabase bucket.</p></section>
      <section><h2 className="font-semibold">AI processing</h2><p>The Google Gemini API receives relevant syllabus content, uploaded documents or images, answers, explanations and prior learning evidence to generate and evaluate lessons. Your name, Google account details and contact information are not included in learning prompts. Requests disable provider-side response storage; provider retention and processing policies still apply. Avoid including personal information in syllabus uploads or answers.</p></section>
      <section><h2 className="font-semibold">Teacher connections</h2><p>A Student ID alone does not reveal learning records. A student can request a connection using a Teacher ID, or a teacher can send an invitation using a Student ID. The recipient must accept before access is granted; they can also reject. Once accepted, the student can see the teacher’s published courses and the teacher can view the student’s progress, answers, reasoning and misconceptions in shared courses. This works the same for every age group, with no guardian-email step. Student-created courses stay private to their owner, and teachers cannot read source uploads or private contact details. Students can disconnect from Home at any time.</p></section>
      <section><h2 className="font-semibold">Installation operator</h2><p>This is a self-hosted installation. The organization running it controls its Supabase and Google Gemini accounts and is responsible for data retention, deletion requests and providing its contact details to users before deployment. Contact {supportEmail ? <a className="font-semibold text-primary underline" href={`mailto:${supportEmail}`}>{supportEmail}</a> : "your school or installation administrator"} to request account or data deletion.</p></section>
      <Link href="/" className="inline-block font-semibold text-primary">Back to Thinkora AI →</Link>
    </Card>
  </main>;
}
