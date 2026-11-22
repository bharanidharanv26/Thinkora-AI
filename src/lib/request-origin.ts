import type { NextRequest } from "next/server";
import { appUrl } from "@/lib/env";

export function requestOrigin(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0]?.trim();
  const proto = (request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "")).split(",")[0]?.trim();
  if (host && /^[a-z0-9.\-:\[\]]+$/i.test(host)) return `${proto === "https" ? "https" : "http"}://${host}`;
  return new URL(appUrl()).origin;
}
