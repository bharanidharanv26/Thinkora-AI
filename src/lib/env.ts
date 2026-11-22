export function publicConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && key && !url.includes("your-project") && !key.startsWith("your-"));
}
export function appUrl() { return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, ""); }
