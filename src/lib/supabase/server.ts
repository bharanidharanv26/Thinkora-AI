import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { publicConfigured } from "@/lib/env";

export async function supabase() {
  if (!publicConfigured()) throw new Error("Configure Supabase in .env.local to enable authentication.");
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); }
        catch { /* Server components cannot set cookies; proxy refreshes the session. */ }
      },
    },
  });
}

export function admin() {
  if (!publicConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase server credentials are not configured.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
