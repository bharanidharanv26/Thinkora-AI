import { describe, expect, it } from "vitest";
import { destinationForProfile } from "@/lib/auth-flow";

describe("profile-based OAuth destinations", () => {
  it("sends a newly authenticated user without a profile to registration", () => {
    expect(destinationForProfile(null)).toBe("/register");
  });
  it("sends registered students to the student dashboard", () => {
    expect(destinationForProfile({ role: "student" })).toBe("/dashboard");
  });
  it("sends registered teachers to the teacher dashboard", () => {
    expect(destinationForProfile({ role: "teacher" })).toBe("/teacher");
  });
});
