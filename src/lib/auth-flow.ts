import type { Profile } from "@/lib/types";

export type AuthDestination = "/dashboard" | "/teacher" | "/register";

export function destinationForProfile(profile: Pick<Profile, "role"> | null): AuthDestination {
  if (!profile) return "/register";
  return profile.role === "teacher" ? "/teacher" : "/dashboard";
}
