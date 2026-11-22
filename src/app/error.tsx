"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/shared";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main" className="mx-auto max-w-lg px-5 py-16"><Logo /><Card className="mt-8 space-y-4 p-6"><h1 className="text-xl font-semibold">We couldn’t load this page.</h1><p className="text-sm leading-6 text-muted-foreground">Your saved learning progress is safe. Try again, or check the database configuration if this is a new installation.</p><div className="flex flex-wrap gap-2"><Button onClick={reset}>Try again</Button><Button variant="outline" asChild><Link href="/setup">Check setup</Link></Button></div></Card></main>;
}
