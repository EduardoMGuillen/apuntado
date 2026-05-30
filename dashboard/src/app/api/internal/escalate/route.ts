import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withVpsAuth } from "@/lib/internal-api";
import {
  buildTeamAlertMessage,
  isProPlan,
  resolveTeamNotifyPhones,
} from "@/lib/team-notify";

export const POST = withVpsAuth(async (req: NextRequest) => {
  const body = await req.json();
  const { businessId, customerPhone, customerMessage, reason } = body;

  if (!businessId || !customerPhone) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      settings: true,
      subscription: true,
      employees: { where: { isActive: true } },
    },
  });

  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  await prisma.customer.upsert({
    where: {
      whatsappPhone_businessId: { whatsappPhone: customerPhone, businessId },
    },
    create: {
      businessId,
      whatsappPhone: customerPhone,
      manualTakeover: true,
      takenOverAt: new Date(),
    },
    update: {
      manualTakeover: true,
      takenOverAt: new Date(),
    },
  });

  const notifyPhones = resolveTeamNotifyPhones({
    notifyPhone: business.settings?.notifyPhone,
    employees: business.employees,
    isPro: isProPlan(business.subscription),
  });

  const alertMessage = buildTeamAlertMessage({
    businessName: business.name,
    customerPhone,
    customerMessage: customerMessage || "",
    reason,
  });

  return NextResponse.json({
    ok: true,
    notifyPhones,
    alertMessage,
    businessName: business.name,
  });
});
