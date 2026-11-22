"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConnectionRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    let lastRefresh = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastRefresh < 5000) return;
      lastRefresh = Date.now();
      startTransition(() => router.refresh());
    };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, startTransition]);

  return <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
    <RefreshCw aria-hidden="true" />{pending ? "Refreshing…" : "Refresh requests"}
  </Button>;
}
