import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withVpsAuth } from "@/lib/internal-api";
import { addHours, addMinutes } from "date-fns";
import { sendPushToBusinessOwner } from "@/lib/push";
import { resolveBusinessTimezone } from "@/lib/timezones";

export const GET = withVpsAuth(async () => {
  const now = new Date();
  const in24h = addHours(now, 24);
  const in23h = addHours(now, 23);
  const in65m = addMinutes(now, 65);
  const in55m = addMinutes(now, 55);

  const reminders24h = await prisma.appointment.findMany({
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

  const reminders1h = await prisma.appointment.findMany({
    where: {
      status: { in: ["pending", "confirmed"] },
      reminder1hSent: false,
      scheduledAt: { gte: in55m, lte: in65m },
    },
    include: {
      customer: true,
      service: true,
      business: { include: { settings: true } },
    },
  });

  const toRemind24h = reminders24h.filter(
    (a) => a.business.settings?.reminder24h !== false
  );
  const toRemind1h = reminders1h.filter(
    (a) => a.business.settings?.reminder24h !== false
  );

  for (const apt of toRemind24h) {
    await prisma.appointment.update({
      where: { id: apt.id },
      data: { reminderSent: true },
    });
    await sendPushToBusinessOwner(apt.businessId, {
      title: "Recordatorio de cita (24h)",
      body: `${apt.customer.name || apt.customer.whatsappPhone} • ${apt.service.name}`,
      url: `/app/${apt.businessId}/citas`,
      tag: `rem24-${apt.id}`,
    });
  }

  for (const apt of toRemind1h) {
    await prisma.appointment.update({
      where: { id: apt.id },
      data: { reminder1hSent: true },
    });
    await sendPushToBusinessOwner(apt.businessId, {
      title: "Cita en 1 hora",
      body: `${apt.customer.name || apt.customer.whatsappPhone} • ${apt.service.name}`,
      url: `/app/${apt.businessId}/citas`,
      tag: `rem1h-${apt.id}`,
    });
  }

  const mapReminder = (a: (typeof toRemind24h)[number]) => ({
    businessId: a.businessId,
    customerPhone: a.customer.whatsappPhone,
    customerReplyJid: a.customer.whatsappReplyJid,
    customerName: a.customer.name,
    businessName: a.business.name,
    scheduledAt: a.scheduledAt.toISOString(),
    serviceName: a.service.name,
    timezone: resolveBusinessTimezone(a.business.settings?.timezone),
  });

  const payload24h = toRemind24h.map((a) => ({
    ...mapReminder(a),
    reminderType: "24h" as const,
  }));
  const payload1h = toRemind1h.map((a) => ({
    ...mapReminder(a),
    reminderType: "1h" as const,
  }));

  return NextResponse.json(
    [...payload24h, ...payload1h]
  );
});
