import { NextResponse, type NextRequest } from "next/server";
import { publicConfigured } from "@/lib/env";
import { destinationForProfile } from "@/lib/auth-flow";
import { profileFor } from "@/lib/server/auth";
import { HttpError } from "@/lib/server/http";
import { requestOrigin } from "@/lib/request-origin";
import { routeClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const finish = (path: string, auth?: ReturnType<typeof routeClient>) => {
    const response = NextResponse.redirect(new URL(path, requestOrigin(request)));
    if (auth) return auth.apply(response);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };

  if (!publicConfigured()) return finish("/?error=setup");

  const providerError = request.nextUrl.searchParams.get("error");
  const errorCode = request.nextUrl.searchParams.get("error_code");
  if (providerError) return finish(providerError === "access_denied" ? "/?error=denied" : `/?error=auth${errorCode ? `&error_code=${encodeURIComponent(errorCode)}` : ""}`);

  const code = request.nextUrl.searchParams.get("code");
  if (!code) return finish("/");

  let auth: ReturnType<typeof routeClient>;
  try { auth = routeClient(request); }
  catch { return finish("/?error=setup"); }

  try {
    const { data, error } = await auth.client.auth.exchangeCodeForSession(code);
    if (error || !data.user) {
      console.error("OAuth code exchange failed", { code: error?.code, status: error?.status });
      return finish("/?error=auth", auth);
    }
    let profile;
    try { profile = await profileFor(data.user.id, auth.client); }
    catch (error) {
      if (error instanceof HttpError && error.status === 503) return finish("/?error=setup", auth);
      throw error;
    }
    return finish(destinationForProfile(profile), auth);
  } catch (error) {
    console.error("OAuth callback failed", { name: error instanceof Error ? error.name : "Unknown" });
    return finish("/?error=auth", auth);
  }
}
