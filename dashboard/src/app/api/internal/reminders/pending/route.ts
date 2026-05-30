import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withVpsAuth } from "@/lib/internal-api";
import { addHours } from "date-fns";

export const GET = withVpsAuth(async () => {
  const now = new Date();
  const in24h = addHours(now, 24);
  const in23h = addHours(now, 23);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["pending", "confirmed"] },
      reminderSent: false,
      scheduledAt: { gte: in23h, lte: in24h },
    },
    include: {
      customer: true,
      service: true,
      business: { include: { settings: true } },
    },
  });

  const toRemind = appointments.filter(
    (a) => a.business.settings?.reminder24h !== false
  );

  for (const apt of toRemind) {
    await prisma.appointment.update({
      where: { id: apt.id },
      data: { reminderSent: true },
    });
  }

  return NextResponse.json(
    toRemind.map((a) => ({
      businessId: a.businessId,
      customerPhone: a.customer.whatsappPhone,
      customerName: a.customer.name,
      businessName: a.business.name,
      scheduledAt: a.scheduledAt.toISOString(),
      serviceName: a.service.name,
    }))
  );
});
