import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { MAX_SYLLABUS_BYTES } from "@/lib/syllabus-files";
import { HttpError } from "./http";

const ticketSchema = z.object({ owner: z.uuid(), path: z.string().max(150), size: z.number().int().min(1).max(MAX_SYLLABUS_BYTES), expires: z.number().int() });
type UploadTicket = z.infer<typeof ticketSchema>;

function signature(payload: string) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new HttpError(503, "File uploads are not configured.");
  return createHmac("sha256", key).update(`thinkora-syllabus-v1:${payload}`).digest();
}

export function signUploadTicket(owner: string, path: string, size: number, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ owner, path, size, expires: now + 2 * 3600000 })).toString("base64url");
  return `${payload}.${signature(payload).toString("base64url")}`;
}

export function verifyUploadTicket(ticket: string, owner: string, now = Date.now()): UploadTicket {
  if (ticket.length > 2048) throw new HttpError(400, "Invalid upload. Select the file and upload it again.");
  const [payload, mac, extra] = ticket.split(".");
  if (!payload || !mac || extra) throw new HttpError(400, "Invalid upload. Select the file and upload it again.");
  const expected = signature(payload);
  const actual = Buffer.from(mac, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new HttpError(400, "Invalid upload. Select the file and upload it again.");
  let data: UploadTicket;
  try { data = ticketSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString())); }
  catch { throw new HttpError(400, "Invalid upload. Select the file and upload it again."); }
  if (data.owner !== owner || !data.path.startsWith(`${owner}/`) || !/^[a-f0-9-]+\/[a-f0-9-]+\.(pdf|png|jpg|jpeg|webp|txt|docx)$/.test(data.path)) throw new HttpError(403, "This upload does not belong to your account.");
  if (data.expires < now) throw new HttpError(410, "This upload has expired. Select the file and upload it again.");
  return data;
}
