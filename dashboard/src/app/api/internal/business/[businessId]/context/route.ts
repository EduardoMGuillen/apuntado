import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyVpsSecret } from "@/lib/bot-prompt";
import { buildAvailabilityText, buildSystemPrompt } from "@/lib/bot-prompt";
import { getSubscriptionAccess } from "@/lib/subscription";
import { addDays, startOfDay } from "date-fns";

export async function GET(
  req: NextRequest,
  { params }: { params: { businessId: string } }
) {
  const secret = req.headers.get("x-vps-secret");
  if (!verifyVpsSecret(secret)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const businessId = params.businessId;
  const phone = req.nextUrl.searchParams.get("phone");

  if (!businessId || !phone) {
    return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 });
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      services: { where: { isActive: true } },
      schedules: true,
      employees: { where: { isActive: true } },
      settings: true,
      subscription: true,
    },
  });

  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const customer = await prisma.customer.findUnique({
    where: {
      whatsappPhone_businessId: { whatsappPhone: phone, businessId },
    },
  });

  const today = startOfDay(new Date());
  const appointments = await prisma.appointment.findMany({
    where: {
      businessId,
      scheduledAt: { gte: today, lte: addDays(today, 3) },
      status: { in: ["pending", "confirmed"] },
    },
    select: { scheduledAt: true, endsAt: true },
  });

  const availability = buildAvailabilityText(business.schedules, appointments);
  const systemPrompt = buildSystemPrompt(business, availability);
  const subscriptionAccess = getSubscriptionAccess(business.subscription);

  return NextResponse.json({
    id: business.id,
    name: business.name,
    type: business.type,
    phone: business.phone,
    city: business.city,
    manualTakeover: customer?.manualTakeover ?? false,
    takenOverAt: customer?.takenOverAt?.toISOString() ?? null,
    subscriptionActive: subscriptionAccess.active,
    systemPrompt,
    availability,
  });
}
