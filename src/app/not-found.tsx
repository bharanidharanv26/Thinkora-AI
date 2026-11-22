import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() { return <main id="main" className="mx-auto max-w-lg px-5 py-20 text-center"><p className="text-sm font-semibold text-primary">404</p><h1 className="mt-3 text-2xl font-semibold">This page isn’t here.</h1><p className="my-5 text-muted-foreground">Check the address or return to your learning space.</p><Button asChild><Link href="/">Go to Thinkora AI</Link></Button></main>; }
