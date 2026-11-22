import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/env";
import { requestOrigin } from "@/lib/request-origin";
import { routeClient } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(appUrl()).origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const auth = routeClient(request);
    const { error } = await auth.client.auth.signOut();
    if (error) return auth.apply(NextResponse.json({ error: "Could not sign out. Please try again." }, { status: 503 }));
    return auth.apply(NextResponse.redirect(new URL("/", requestOrigin(request)), 303));
  } catch {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }
}
