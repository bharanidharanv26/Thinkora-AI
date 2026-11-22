import { describe, expect, it } from "vitest";
import { teacherCodeFor } from "@/lib/teacher-code";

describe("teacher IDs", () => {
  it("derives a stable ID from the profile UUID", () => {
    expect(teacherCodeFor("98d4147e-1234-4abc-8def-0123456789ab")).toBe("THT-98D4147E12");
    expect(teacherCodeFor("98d4147e-1234-4abc-8def-0123456789ab")).toBe("THT-98D4147E12");
  });
});
