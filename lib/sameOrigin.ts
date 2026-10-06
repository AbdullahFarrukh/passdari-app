import { NextRequest, NextResponse } from "next/server";

// Blocks cross-site writes. A browser sends an Origin header on a cross-site request; if it names some
// other site, the request is refused. Requests with no Origin (the Vercel cron job, curl, server-to-server)
// are allowed through. CORS is deliberately not opened up anywhere: without it, other sites can't read
// these responses in the first place.
export function rejectCrossSite(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  if (origin === null) return null;
  if (origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Cross-site requests are not allowed." }, { status: 403 });
  }
  return null;
}
