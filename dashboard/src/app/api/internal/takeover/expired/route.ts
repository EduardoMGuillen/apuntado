import { NextResponse } from "next/server";
import { withVpsAuth } from "@/lib/internal-api";
import { findIdleManualTakeovers } from "@/lib/manual-takeover-idle";

export const GET = withVpsAuth(async () => {
  const expired = await findIdleManualTakeovers();
  return NextResponse.json(expired);
});
