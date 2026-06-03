import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getBusinessForSession } from "@/lib/business-access";
import { getConversationUsage } from "@/lib/conversation-usage";
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

  const businessId = params.id;
  const business = await getBusinessForSession(session, businessId, {
    settings: true,
    subscription: true,
  });

  if (!business) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const timezone = resolveBusinessTimezone(business.settings?.timezone);
  const access = getSubscriptionAccess(business.subscription);
  const usage = await getConversationUsage(
    businessId,
    access.plan,
    timezone
  );

  return NextResponse.json({
    plan: access.plan,
    active: access.active,
    ...usage,
  });
}
