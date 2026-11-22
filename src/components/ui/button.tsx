import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
export const buttonVariants = cva("inline-flex min-h-11 max-w-full shrink-0 items-center justify-center gap-2 rounded-lg text-center text-sm font-semibold outline-none active:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0", {
  variants: {
    variant: { default: "bg-primary text-primary-foreground hover:bg-[#076e70]", outline: "border bg-white hover:bg-muted", secondary: "bg-secondary text-secondary-foreground hover:bg-slate-200", ghost: "hover:bg-muted text-muted-foreground", destructive: "bg-destructive text-white hover:bg-red-700", link: "text-primary underline-offset-4 hover:underline" },
    size: { default: "px-5 py-2.5", sm: "px-3 py-2", lg: "px-6 py-3 text-base min-h-12", icon: "size-11 p-2" },
  }, defaultVariants: { variant: "default", size: "default" },
});
export function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
