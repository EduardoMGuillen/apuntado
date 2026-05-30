import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();

  const result = await prisma.subscription.updateMany({
    where: {
      plan: "trial",
      status: "active",
      trialEndsAt: { lt: now },
      stripeSubscriptionId: null,
    },
    data: { status: "expired" },
  });

  return NextResponse.json({ ok: true, expired: result.count });
}
