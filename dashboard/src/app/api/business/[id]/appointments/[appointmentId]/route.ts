import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireBusinessApiAccess } from "@/lib/api-business-guard";
import { sendWhatsappMessage } from "@/lib/vps";
import { resolveReplyJid } from "@/lib/reply-jid";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { addMinutes } from "date-fns";
import { resolveBusinessTimezone } from "@/lib/timezones";
import { isScheduledAtInPast } from "@/lib/business-datetime";

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("cancel"),
    reason: z.string().trim().max(180).optional(),
  }),
  z.object({
    action: z.literal("reschedule"),
    scheduledAt: z.string().datetime(),
    reason: z.string().trim().max(180).optional(),
  }),
]);

async function sendCustomerNotice(params: {
  businessId: string;
  customerPhone: string;
  customerReplyJid?: string | null;
  text: string;
}) {
  const replyJid = resolveReplyJid(params.customerPhone, params.customerReplyJid);
  await sendWhatsappMessage(
    params.businessId,
    params.customerPhone,
    params.text,
    replyJid
  );
  await prisma.whatsappMessage.create({
    data: {
      businessId: params.businessId,
      customerPhone: params.customerPhone,
      body: params.text,
      fromClient: false,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; appointmentId: string } }
) {
  const access = await requireBusinessApiAccess(params.id);
  if (access.response) return access.response;

  const appointment = await prisma.appointment.findFirst({
    where: { id: params.appointmentId, businessId: params.id },
    include: {
      customer: true,
      service: true,
      business: true,
      employee: true,
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }
  const businessSettings = await prisma.businessSettings.findUnique({
    where: { businessId: params.id },
    select: { timezone: true },
  });
  const timezone = resolveBusinessTimezone(businessSettings?.timezone);

  try {
    const payload = patchSchema.parse(await req.json());
    const reason = payload.reason?.trim();

    if (payload.action === "cancel") {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: "cancelled" },
      });

      const notice = [
        `Hola ${appointment.customer.name || ""}, tu cita en ${appointment.business.name} fue cancelada.`,
        `Servicio: ${appointment.service.name}`,
        `Fecha: ${formatInTimeZone(
          appointment.scheduledAt,
          timezone,
          "EEEE d 'de' MMMM · h:mm a",
          { locale: es }
        )}`,
        reason ? `Motivo: ${reason}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      await sendCustomerNotice({
        businessId: params.id,
        customerPhone: appointment.customer.whatsappPhone,
        customerReplyJid: appointment.customer.whatsappReplyJid,
        text: notice,
      });

      return NextResponse.json({ ok: true, status: "cancelled" });
    }

    const newStart = new Date(payload.scheduledAt);
    if (Number.isNaN(newStart.getTime())) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }
    if (isScheduledAtInPast(newStart, timezone)) {
      return NextResponse.json(
        {
          error:
            "La nueva fecha debe ser futura en la zona horaria configurada del negocio.",
        },
        { status: 400 }
      );
    }

    const newEndsAt = addMinutes(newStart, appointment.service.durationMin);

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { scheduledAt: newStart, endsAt: newEndsAt, status: "confirmed" },
    });

    const notice = [
      `Hola ${appointment.customer.name || ""}, tu cita en ${appointment.business.name} fue reprogramada.`,
      `Servicio: ${appointment.service.name}`,
      `Nueva fecha: ${formatInTimeZone(
        newStart,
        timezone,
        "EEEE d 'de' MMMM · h:mm a",
        { locale: es }
      )}`,
      reason ? `Nota: ${reason}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await sendCustomerNotice({
      businessId: params.id,
      customerPhone: appointment.customer.whatsappPhone,
      customerReplyJid: appointment.customer.whatsappReplyJid,
      text: notice,
    });

    return NextResponse.json({
      ok: true,
      status: "confirmed",
      scheduledAt: newStart.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "No se pudo actualizar la cita" }, { status: 500 });
  }
}
