import Link from "next/link";
import { BrainCircuit, ArrowRight, AlertCircle, CheckCircle2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
export function Logo({ small = false }: { small?: boolean }) {
  return <Link href="/" aria-label="Thinkora AI home" className="inline-flex shrink-0 items-center gap-2.5 font-bold tracking-tight"><span className={cn("flex items-center justify-center rounded-xl bg-primary text-white", small ? "size-8" : "size-10")}><BrainCircuit className={small ? "size-5" : "size-6"} /></span><span className={small ? "text-lg" : "text-xl"}>Thinkora <span className="text-primary">AI</span></span></Link>;
}
export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="min-w-0">{eyebrow && <p className="mb-2 text-xs font-medium text-muted-foreground">{eyebrow}</p>}<h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>{action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}</div>;
}
export function EmptyState({ icon: Icon = BrainCircuit, title, description, href, label }: { icon?: LucideIcon; title: string; description: string; href?: string; label?: string }) {
  return <div className="flex flex-col items-center px-5 py-10 text-center"><Icon aria-hidden="true" className="mb-3 size-6 text-muted-foreground" /><h3 className="font-semibold">{title}</h3><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>{href && <Button className="mt-5 w-full sm:w-auto" asChild><Link href={href}>{label ?? "Get started"}<ArrowRight /></Link></Button>}</div>;
}
export function Notice({ children, error = false, className }: { children: React.ReactNode; error?: boolean; className?: string }) {
  return <div role={error ? "alert" : "status"} className={cn("flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm leading-6", error ? "border-red-200 bg-red-50 text-red-800" : "border-teal-100 bg-teal-50 text-teal-900", className)}>{error ? <AlertCircle className="mt-1 size-4 shrink-0" /> : <CheckCircle2 className="mt-1 size-4 shrink-0" />}<div className="min-w-0 break-words">{children}</div></div>;
}
export function StatCard({ icon: Icon, value, label, detail, blue = false }: { icon: LucideIcon; value: string | number; label: string; detail?: string; blue?: boolean }) {
  return <Card className="flex items-start gap-4 p-5"><div className={cn("rounded-xl p-2.5", blue ? "bg-blue-50 text-blue-600" : "bg-accent text-primary")}><Icon className="size-5" /></div><div className="min-w-0"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>{detail && <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>}</div></Card>;
}
