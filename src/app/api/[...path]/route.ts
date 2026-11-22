import { endpoint } from "@/lib/server/http";
import { handleGet, handlePost } from "@/lib/server/api";
export const runtime = "nodejs";
export const maxDuration = 240;
export const GET = endpoint(handleGet);
export const POST = endpoint(handlePost);
