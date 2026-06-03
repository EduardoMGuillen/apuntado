import { NextRequest, NextResponse } from "next/server";
import { withVpsAuth } from "@/lib/internal-api";
import { recordAiCall } from "@/lib/plan-usage";
import { resolveBusinessTimezone } from "@/lib/timezones";
import { prisma } from "@/lib/prisma";

export const POST = withVpsAuth(async (req: NextRequest) => {
  const body = await req.json();
  const { businessId } = body as { businessId?: string };

  if (!businessId) {
    return NextResponse.json({ error: "businessId requerido" }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { settings: true },
  });
  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const timezone = resolveBusinessTimezone(business.settings?.timezone);
  const { count } = await recordAiCall(businessId, timezone);

  return NextResponse.json({ ok: true, aiCallCount: count });
});
