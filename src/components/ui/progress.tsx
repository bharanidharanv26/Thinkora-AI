import { cn } from "@/lib/utils";
export function Progress({ value, label = "Learning progress", className }: { value: number; label?: string; className?: string }) {
  const n = Math.max(0, Math.min(100, value));
  return <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(n)} className={cn("h-2 overflow-hidden rounded-full bg-slate-100", className)}><div className="h-full rounded-full bg-primary" style={{ width: `${n}%` }} /></div>;
}
