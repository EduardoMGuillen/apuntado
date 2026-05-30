import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Marca como expirados negocios que nunca completaron el checkout con tarjeta. */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const result = await prisma.subscription.updateMany({
    where: {
      status: "pending",
      stripeSubscriptionId: null,
      updatedAt: { lt: cutoff },
    },
    data: { status: "expired" },
  });

  return NextResponse.json({ ok: true, expired: result.count });
}
