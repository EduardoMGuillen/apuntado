import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDays, differenceInDays } from "date-fns";
import { sendTrialEndingEmail } from "@/lib/resend";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  const in3Days = addDays(now, 3);

  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: "active",
      trialReminderSent: false,
      trialEndsAt: { gte: now, lte: in3Days },
      stripeSubscriptionId: { not: null },
    },
    include: {
      business: {
        include: {
          owner: { select: { email: true, name: true } },
        },
      },
    },
  });

  let sent = 0;

  for (const sub of subscriptions) {
    if (!sub.trialEndsAt || !sub.business.owner.email) continue;

    const daysLeft = Math.max(1, differenceInDays(sub.trialEndsAt, now));

    const ok = await sendTrialEndingEmail({
      to: sub.business.owner.email,
      name: sub.business.owner.name,
      businessName: sub.business.name,
      daysLeft,
      businessId: sub.businessId,
    });

    if (ok) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { trialReminderSent: true },
      });
      sent++;
    }
  }

  return NextResponse.json({ ok: true, sent, checked: subscriptions.length });
}
