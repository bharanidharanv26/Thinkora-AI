import { pageProfile } from "@/lib/server/auth";
import { studentData } from "@/lib/server/dashboards";
import { admin } from "@/lib/supabase/server";
import { StudentDashboard } from "@/components/student-dashboard";
export default async function Dashboard() {
  const profile = await pageProfile("student"); const data = await studentData(profile.id);
  const active = data.enrollments.find(e => e.status !== "completed") ?? data.enrollments[0];
  let topic: string | undefined;
  if (active) {
    const { data: session } = await admin().from("learning_sessions").select("current_question_id").eq("enrollment_id", active.id).maybeSingle();
    if (session?.current_question_id) { const { data: question } = await admin().from("questions").select("concept_id").eq("id", session.current_question_id).maybeSingle(); topic = data.concepts.find(c => c.id === question?.concept_id)?.title; }
  }
  return <StudentDashboard profile={profile} data={data} currentTopic={topic} />;
}
