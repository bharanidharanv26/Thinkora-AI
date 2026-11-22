import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z, ZodError } from "zod";
import { appUrl } from "@/lib/env";
import { admin } from "@/lib/supabase/server";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function assertOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(appUrl()).origin) throw new HttpError(403, "Request origin is not allowed.");
}
export async function jsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const text = new TextDecoder().decode(await boundedBody(request, 20000));
  try { return schema.parse(JSON.parse(text)); }
  catch (error) { if (error instanceof ZodError) throw error; throw new HttpError(400, "Invalid JSON request."); }
}
export async function boundedBody(request: Request, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(request.headers.get("content-length") || 0) > limit) throw new HttpError(413, "The request is too large.");
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array(0);
  let size = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new HttpError(413, "The request is too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
export function unwrap<T>(result: { data: unknown; error: { message: string; code?: string } | null }): T {
  if (result.error) {
    console.error(`Database operation failed [${result.error.code || "unknown"}]: ${result.error.message || "No database error message returned."}`);
    throw new HttpError(503, "The database could not complete this request. Check database setup or try again.");
  }
  return result.data as T;
}
export async function rateLimit(user: string, operation: string, limit = 20, seconds = 3600) {
  const allowed = unwrap<boolean>(await admin().rpc("check_rate_limit", { p_bucket: `${operation}:${user}`, p_limit: limit, p_seconds: seconds }));
  if (!allowed) throw new HttpError(429, "Too many requests. Please wait before trying again.");
}
export function endpoint(handler: (request: NextRequest) => Promise<unknown>) {
  return async (request: NextRequest) => {
    try {
      if (request.method !== "GET") assertOrigin(request);
      const data = await handler(request);
      return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
      if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Check your input." }, { status: 400 });
      if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
      if (error instanceof Error && /not configured|credentials are not configured/.test(error.message)) return NextResponse.json({ error: error.message }, { status: 503 });
      console.error("Request failed", error instanceof Error ? error.name : "Unknown error");
      return NextResponse.json({ error: "We could not complete this request. Your saved progress is safe. Please try again." }, { status: 500 });
    }
  };
}
export const idSchema = z.uuid();
