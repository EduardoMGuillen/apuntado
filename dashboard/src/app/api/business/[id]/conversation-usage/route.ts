import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getBusinessForSession } from "@/lib/business-access";
import { getMonthlyPlanUsage } from "@/lib/plan-usage";
import { getSubscriptionAccess } from "@/lib/subscription";
import { resolveBusinessTimezone } from "@/lib/timezones";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const business = await getBusinessForSession(session, params.id, {
    settings: true,
    subscription: true,
  });

  if (!business) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const timezone = resolveBusinessTimezone(business.settings?.timezone);
  const access = getSubscriptionAccess(business.subscription);
  const usage = await getMonthlyPlanUsage(
    business.id,
    access.plan,
    timezone,
    access.reason
  );

  return NextResponse.json({
    plan: access.plan,
    active: access.active,
    reason: access.reason,
    ...usage,
  });
}
