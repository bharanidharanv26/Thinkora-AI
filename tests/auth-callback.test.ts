import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  routeClient: vi.fn(),
  profileFor: vi.fn(),
  publicConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/supabase/route", () => ({ routeClient: mocks.routeClient }));
vi.mock("@/lib/server/auth", () => ({ profileFor: mocks.profileFor }));
vi.mock("@/lib/env", () => ({ publicConfigured: mocks.publicConfigured, appUrl: () => "http://localhost:3000" }));

import { GET } from "@/app/auth/callback/route";
import { HttpError } from "@/lib/server/http";

function authFixture({ user = { id: "user-1" }, error = null }: { user?: { id: string } | null; error?: Error | null } = {}) {
  const apply = vi.fn((response: Response) => response);
  const exchangeCodeForSession = vi.fn().mockResolvedValue({ data: { user }, error });
  return { auth: { client: { auth: { exchangeCodeForSession } }, apply }, exchangeCodeForSession, apply };
}

function request(path = "/auth/callback?code=test-code") {
  return new NextRequest(`http://localhost:3000${path}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.publicConfigured.mockReturnValue(true);
});

describe("Google OAuth callback", () => {
  it("redirects a new authenticated user to registration", async () => {
    const fixture = authFixture();
    mocks.routeClient.mockReturnValue(fixture.auth);
    mocks.profileFor.mockResolvedValue(null);
    const response = await GET(request());
    expect(response.headers.get("location")).toBe("http://localhost:3000/register");
    expect(fixture.exchangeCodeForSession).toHaveBeenCalledWith("test-code");
    expect(fixture.apply).toHaveBeenCalledWith(response);
  });

  it("redirects registered students and teachers to their dashboards", async () => {
    for (const [role, destination] of [["student", "/dashboard"], ["teacher", "/teacher"]] as const) {
      const fixture = authFixture();
      mocks.routeClient.mockReturnValue(fixture.auth);
      mocks.profileFor.mockResolvedValue({ role });
      const response = await GET(request());
      expect(response.headers.get("location")).toBe(`http://localhost:3000${destination}`);
    }
  });

  it("applies the exchanged session cookies to the final redirect", async () => {
    const fixture = authFixture();
    mocks.routeClient.mockReturnValue(fixture.auth);
    mocks.profileFor.mockResolvedValue({ role: "student" });
    const response = await GET(request());
    expect(fixture.apply).toHaveBeenCalledOnce();
    expect(fixture.apply.mock.calls[0][0]).toBe(response);
  });

  it("routes a database schema failure to the setup message instead of a login loop", async () => {
    const fixture = authFixture();
    mocks.routeClient.mockReturnValue(fixture.auth);
    mocks.profileFor.mockRejectedValue(new HttpError(503, "Profile schema missing"));
    const response = await GET(request());
    expect(response.headers.get("location")).toBe("http://localhost:3000/?error=setup");
    expect(fixture.apply).toHaveBeenCalledWith(response);
  });

  it("routes an exchange failure to a sign-in error and still applies cookie cleanup", async () => {
    const fixture = authFixture({ user: null, error: new Error("invalid code") });
    mocks.routeClient.mockReturnValue(fixture.auth);
    const response = await GET(request());
    expect(response.headers.get("location")).toBe("http://localhost:3000/?error=auth");
    expect(fixture.apply).toHaveBeenCalledWith(response);
  });

  it("handles a cancelled Google sign-in", async () => {
    const response = await GET(request("/auth/callback?error=access_denied"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/?error=denied");
  });

  it("preserves an expired OAuth state so the page can retry once", async () => {
    const response = await GET(request("/auth/callback?error=invalid_request&error_code=bad_oauth_state"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/?error=auth&error_code=bad_oauth_state");
  });

  it("returns to the app when no code is present so an existing session can route", async () => {
    const response = await GET(request("/auth/callback"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
    expect(mocks.routeClient).not.toHaveBeenCalled();
  });

  it("reports setup when Supabase is not configured", async () => {
    mocks.publicConfigured.mockReturnValue(false);
    const response = await GET(request());
    expect(response.headers.get("location")).toBe("http://localhost:3000/?error=setup");
  });
});
