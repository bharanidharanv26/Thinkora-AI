import * as React from "react";
import { cn } from "@/lib/utils";
export function Input({ className, ...props }: React.ComponentProps<"input">) { return <input className={cn("flex min-h-11 w-full min-w-0 rounded-lg border border-input bg-white px-3 py-2 text-base placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50", className)} {...props} />; }
export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) { return <textarea className={cn("flex min-h-28 w-full min-w-0 resize-y rounded-lg border border-input bg-white px-3 py-3 text-base leading-6 placeholder:text-slate-400 disabled:opacity-50", className)} {...props} />; }
export function Select({ className, ...props }: React.ComponentProps<"select">) { return <select className={cn("min-h-11 w-full min-w-0 rounded-lg border border-input bg-white px-3 py-2 text-base", className)} {...props} />; }
export function Label({ className, ...props }: React.ComponentProps<"label">) { return <label className={cn("mb-2 block text-sm font-medium", className)} {...props} />; }
