"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import type { Profile } from "@/lib/types";
import { Logo } from "@/components/shared";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ShellProfile = Pick<Profile, "role" | "display_name"> & { student_code?: string | null; teacher_code?: string | null };

export function AppShell({ profile, children }: { profile: ShellProfile; children: React.ReactNode }) {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function dismiss(event: PointerEvent) {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false;
    }
    document.addEventListener("pointerdown", dismiss);
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && menu.current?.open) {
        menu.current.open = false;
        menu.current.querySelector("summary")?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
  useEffect(() => { if (menu.current) menu.current.open = false; }, [pathname]);
  const student = profile.role === "student";
  const nav = student ? [
    { href: "/dashboard", label: "Home", active: ["/dashboard", "/connections"].includes(pathname) },
    { href: "/courses", label: "Courses", active: ["/courses", "/learn"].some(path => pathname.startsWith(path)) },
  ] : [
    { href: "/teacher/students", label: "Students", active: pathname.startsWith("/teacher/students") },
    { href: "/courses", label: "Courses", active: pathname.startsWith("/courses") },
    { href: "/teacher/insights", label: "Student Progress", active: pathname.startsWith("/teacher/insights") },
  ];
  const initials = profile.display_name.trim().split(/\s+/).map(name => name[0]).slice(0, 2).join("");

  return <div className="flex min-h-dvh flex-col">
    <header className="safe-header border-b bg-white">
      <div className="safe-inline mx-auto flex max-w-5xl items-center justify-between gap-4 py-4">
        <Logo small />
        <details ref={menu} className="relative">
          <summary aria-label="Your profile" className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-1.5 [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">{initials}</span>
            <span className="hidden max-w-40 truncate text-sm font-medium sm:inline">{profile.display_name}</span>
            <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" />
          </summary>
          <div className="absolute right-0 z-40 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border bg-white p-4 shadow-sm">
            <p className="break-words text-sm font-semibold">{profile.display_name}</p>
            <p className="mt-1 text-xs capitalize text-muted-foreground">{profile.role}</p>
            <div className="my-4 border-y py-3"><p className="text-xs text-muted-foreground">{student ? "Student ID" : "Teacher ID"}</p><p className="mt-1 select-all font-mono text-sm">{student ? profile.student_code ?? "Available after registration" : profile.teacher_code ?? "Available after registration"}</p></div>
            <form action="/auth/logout" method="post"><Button type="submit" variant="ghost" className="mt-2 w-full justify-start px-0"><LogOut />Sign out</Button></form>
          </div>
        </details>
      </div>
      <nav aria-label="Main navigation" className={`safe-inline mx-auto grid max-w-5xl gap-1 sm:flex sm:gap-8 ${student ? "grid-cols-2" : "grid-cols-3"}`}>
        {nav.map(({ href, label, active }) => <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex min-h-12 items-center justify-center border-b-2 px-1 py-3 text-sm font-medium sm:px-2", active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{label}</Link>)}
      </nav>
    </header>
    <main id="main" className="safe-main mx-auto w-full max-w-5xl flex-1 py-7 sm:py-9">{children}</main>
    <footer className="safe-inline mx-auto flex w-full max-w-5xl items-center justify-between gap-4 border-t py-5 text-xs text-muted-foreground"><span>Thinkora AI</span><Link href="/privacy" className="inline-flex min-h-11 items-center">Privacy</Link></footer>
  </div>;
}
