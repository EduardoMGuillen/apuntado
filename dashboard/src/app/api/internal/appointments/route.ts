import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withVpsAuth } from "@/lib/internal-api";
import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { sendNewAppointmentEmail } from "@/lib/resend";
import { reconcileCustomerPhone } from "@/lib/customer-phone";
import { matchServiceByName } from "@/lib/match-service";
import { DEFAULT_INQUIRY_SERVICE } from "@/lib/booking-modes";
import { sendPushToBusinessOwner } from "@/lib/push";
import { resolveBusinessTimezone } from "@/lib/timezones";
import { isScheduledAtInPast } from "@/lib/business-datetime";
import { getCalendarConnection } from "@/lib/google-calendar/client";
import { getMergedAvailabilityBusy } from "@/lib/google-calendar/availability";
import { intervalsOverlap } from "@/lib/google-calendar/busy";
import { syncAppointmentToGoogle } from "@/lib/google-calendar/sync";

const CLIENT_TYPES = new Set(["empresa", "particular"]);

export const POST = withVpsAuth(async (req: NextRequest) => {
  const body = await req.json();
  const {
    businessId,
    customerPhone: rawPhone,
    serviceName,
    scheduledAt,
    employeeName,
    customerName,
    clientType,
  } = body;

  if (!businessId || !rawPhone || !serviceName || !scheduledAt) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const name = typeof customerName === "string" ? customerName.trim() : "";
  if (name.length < 2) {
    return NextResponse.json(
      { error: "Nombre del cliente requerido (mínimo 2 caracteres)" },
      { status: 400 }
    );
  }

  const type =
    typeof clientType === "string" ? clientType.trim().toLowerCase() : "";
  if (!CLIENT_TYPES.has(type)) {
    return NextResponse.json(
      { error: "clientType debe ser empresa o particular" },
      { status: 400 }
    );
  }

  const phone = await reconcileCustomerPhone(businessId, rawPhone);

  const services = await prisma.service.findMany({
    where: { businessId, isActive: true },
  });

  let service = matchServiceByName(services, serviceName);
  if (!service) {
    service = matchServiceByName(services, DEFAULT_INQUIRY_SERVICE.name);
  }

  if (!service) {
    return NextResponse.json(
      {
        error: "Servicio no encontrado",
        requested: serviceName,
        available: services.map((s) => s.name),
      },
      { status: 404 }
    );
  }

  let employeeId: string | undefined;
  if (employeeName) {
    const employee = await prisma.employee.findFirst({
      where: { businessId, name: employeeName, isActive: true },
    });
    employeeId = employee?.id;
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { settings: { select: { timezone: true } } },
  });
  const timezone = resolveBusinessTimezone(business?.settings?.timezone);

  const customer = await prisma.customer.upsert({
    where: {
      whatsappPhone_businessId: { whatsappPhone: phone, businessId },
    },
    create: {
      businessId,
      whatsappPhone: phone,
      name,
      clientType: type,
    },
    update: {
      name,
      clientType: type,
    },
  });

  let start: Date;
  try {
    start = new Date(scheduledAt);
    if (Number.isNaN(start.getTime())) {
      throw new Error("invalid date");
    }
  } catch {
    return NextResponse.json(
      { error: "Fecha/hora inválida (scheduledAt ISO8601)" },
      { status: 400 }
    );
  }

  if (isScheduledAtInPast(start, timezone)) {
    return NextResponse.json(
      {
        error:
          "No se puede agendar en una fecha/hora pasada para la zona horaria del negocio.",
      },
      { status: 400 }
    );
  }

  const endsAt = addMinutes(start, service.durationMin);

  const gcalConn = await getCalendarConnection(businessId);
  if (gcalConn) {
    const busy = await getMergedAvailabilityBusy(businessId, timezone, 30);
    if (intervalsOverlap(start, endsAt, busy)) {
      return NextResponse.json(
        {
          error:
            "Ese horario ya está ocupado (cita existente o bloqueo en Google Calendar).",
        },
        { status: 409 }
      );
    }
  }

  const appointment = await prisma.appointment.create({
    data: {
      businessId,
      customerId: customer.id,
      serviceId: service.id,
      employeeId,
      scheduledAt: start,
      endsAt,
      status: "confirmed",
    },
    include: {
      business: { include: { owner: true } },
      service: true,
      customer: true,
    },
  });

  const fechaLabel = formatInTimeZone(
    start,
    timezone,
    "EEEE d 'de' MMMM · h:mm a",
    {
    locale: es,
    }
  );

  if (appointment.business.owner.email) {
    sendNewAppointmentEmail({
      to: appointment.business.owner.email,
      businessName: appointment.business.name,
      customerPhone: phone,
      customerName: name,
      serviceName: appointment.service.name,
      scheduledAt: fechaLabel,
    }).catch(console.error);
  }

  await sendPushToBusinessOwner(businessId, {
    title: "Nueva cita agendada",
    body: `${name} • ${appointment.service.name} • ${fechaLabel}`,
    url: `/app/${businessId}/citas`,
    tag: `apt-${businessId}`,
  });

  console.log(
    `[Appointments] Cita creada ${appointment.id} — ${name} (${type}) — ${service.name} — ${fechaLabel}`
  );

  syncAppointmentToGoogle(appointment.id).catch(console.error);

  return NextResponse.json(appointment);
});
