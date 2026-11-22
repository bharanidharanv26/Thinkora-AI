import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicConfigured } from "@/lib/env";

type PendingCookie = { name: string; value: string; options: CookieOptions };

export function routeClient(request: NextRequest) {
  if (!publicConfigured()) throw new Error("Supabase is not configured.");
  const pending = new Map<string, PendingCookie>();
  const responseHeaders = new Map<string, string>();
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => {
        const merged = new Map(request.cookies.getAll().map(cookie => [cookie.name, cookie.value]));
        pending.forEach(cookie => merged.set(cookie.name, cookie.value));
        return [...merged].map(([name, value]) => ({ name, value }));
      },
      setAll: (cookies, headers) => {
        cookies.forEach(cookie => pending.set(cookie.name, cookie));
        Object.entries(headers).forEach(([key, value]) => responseHeaders.set(key, value));
      },
    },
  });
  return {
    client,
    apply<T extends NextResponse>(response: T): T {
      pending.forEach(cookie => response.cookies.set(cookie.name, cookie.value, cookie.options));
      responseHeaders.forEach((value, key) => response.headers.set(key, value));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    },
  };
}
