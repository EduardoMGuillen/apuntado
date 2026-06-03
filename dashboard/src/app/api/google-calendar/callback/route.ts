import { NextRequest, NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/token-crypto";
import { exchangeCodeAndStoreConnection } from "@/lib/google-calendar/oauth";

export async function GET(req: NextRequest) {
  const base = (process.env.NEXTAUTH_URL || "").replace(/\/$/, "");

  const error = req.nextUrl.searchParams.get("error");
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  const payload = state
    ? verifyOAuthState<{ businessId: string; userId: string; ts: number }>(state)
    : null;

  const businessId = payload?.businessId;
  const settingsUrl = businessId
    ? `${base}/app/${businessId}/configuracion`
    : `${base}/app`;

  if (error) {
    return NextResponse.redirect(`${settingsUrl}?googleCalendar=denied`);
  }

  if (!code || !state || !payload || !businessId) {
    return NextResponse.redirect(`${settingsUrl}?googleCalendar=error`);
  }

  if (Date.now() - payload.ts > 15 * 60 * 1000) {
    return NextResponse.redirect(`${settingsUrl}?googleCalendar=expired`);
  }

  try {
    await exchangeCodeAndStoreConnection({ businessId, code });
    return NextResponse.redirect(`${settingsUrl}?googleCalendar=connected`);
  } catch (err) {
    console.error("[GoogleCalendar] callback:", err);
    return NextResponse.redirect(`${settingsUrl}?googleCalendar=error`);
  }
}
