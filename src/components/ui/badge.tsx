import * as React from "react";
import { cn } from "@/lib/utils";
export function Badge({ className, tone = "neutral", ...props }: React.ComponentProps<"span"> & { tone?: "neutral" | "teal" | "blue" | "amber" }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium", { neutral: "bg-muted text-muted-foreground", teal: "bg-teal-50 text-teal-800", blue: "bg-blue-50 text-blue-800", amber: "bg-amber-50 text-amber-800" }[tone], className)} {...props} />;
}
