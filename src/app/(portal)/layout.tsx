import { pageProfile } from "@/lib/server/auth";
import { AppShell } from "@/components/app-shell";
export const dynamic = "force-dynamic";
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await pageProfile();
  return <AppShell profile={{ display_name: profile.display_name, role: profile.role, student_code: profile.student_code, teacher_code: profile.teacher_code }}>{children}</AppShell>;
}
