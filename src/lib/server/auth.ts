import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/server";
import { publicConfigured } from "@/lib/env";
import type { Profile, Role } from "@/lib/types";
import { HttpError } from "./http";
import { teacherCodeFor } from "@/lib/teacher-code";

export async function identity() {
  if (!publicConfigured()) throw new HttpError(503, "Supabase is not configured. Complete the setup instructions first.");
  const client = await supabase();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new HttpError(401, "Please sign in to continue.");
  return user;
}
export async function profileFor(id: string, client?: SupabaseClient) {
  const db = client ?? await supabase();
  const { data, error } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("Profile lookup failed", { code: error.code });
    throw new HttpError(503, "Your account is signed in, but your Thinkora profile could not be loaded. Apply the database migration and try again.");
  }
  const profile = data as Profile | null;
  if (!profile) return null;
  return profile.role === "teacher" ? { ...profile, teacher_code: profile.teacher_code || teacherCodeFor(profile.id) } : profile;
}
export async function requireProfile(role?: Role) {
  const user = await identity();
  const profile = await profileFor(user.id);
  if (!profile) throw new HttpError(403, "Complete your registration first.");
  if (role && profile.role !== role) throw new HttpError(403, "You do not have permission to perform this action.");
  return profile;
}
export async function pageProfile(role?: Role) {
  if (!publicConfigured()) redirect("/?error=setup");
  let user;
  try { user = await identity(); } catch { redirect("/"); }
  let profile: Profile | null = null;
  try { profile = await profileFor(user.id); }
  catch (error) {
    if (error instanceof HttpError && error.status === 503) redirect("/?error=setup");
    throw error;
  }
  if (!profile) redirect("/register");
  if (role && profile.role !== role) redirect(profile.role === "teacher" ? "/teacher" : "/dashboard");
  return profile;
}
