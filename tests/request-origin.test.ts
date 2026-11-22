import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/env", () => ({ appUrl: () => "http://localhost:3000" }));

import { requestOrigin } from "@/lib/request-origin";

describe("request origin", () => {
  it("uses the browser host instead of the server bind address", () => {
    const request = new NextRequest("http://0.0.0.0:3000/auth/callback", { headers: { host: "192.168.1.20:3000" } });
    expect(requestOrigin(request)).toBe("http://192.168.1.20:3000");
  });

  it("honours forwarded host and protocol behind a proxy", () => {
    const request = new NextRequest("http://localhost:3000/auth/callback", { headers: { "x-forwarded-host": "thinkora.example", "x-forwarded-proto": "https" } });
    expect(requestOrigin(request)).toBe("https://thinkora.example");
  });

  it("falls back to the configured app origin when the host header is invalid", () => {
    const request = new NextRequest("http://0.0.0.0:3000/auth/callback", { headers: { host: "bad host" } });
    expect(requestOrigin(request)).toBe("http://localhost:3000");
  });
});
