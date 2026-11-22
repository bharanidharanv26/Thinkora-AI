import { notFound } from "next/navigation";
import { pageProfile } from "@/lib/server/auth";
import { loadState, ownedEnrollment } from "@/lib/server/data";
import { HttpError, idSchema } from "@/lib/server/http";
import { LearningRoom } from "@/components/learning-room";
export default async function Learn({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ revision?: string }> }) {
  const profile = await pageProfile("student"); const { id } = await params; const { revision } = await searchParams;
  if (!idSchema.safeParse(id).success) notFound();
  let state;
  try { const enrollment = await ownedEnrollment(id, profile.id); state = await loadState(enrollment); }
  catch (e) { if (e instanceof HttpError && e.status === 404) notFound(); throw e; }
  return <LearningRoom key={id} initial={state} revisionConcept={revision && idSchema.safeParse(revision).success ? revision : undefined} />;
}
