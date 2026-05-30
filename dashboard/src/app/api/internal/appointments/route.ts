import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withVpsAuth } from "@/lib/internal-api";
import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { sendNewAppointmentEmail } from "@/lib/resend";

const TZ = "America/Tegucigalpa";

export const POST = withVpsAuth(async (req: NextRequest) => {
  const body = await req.json();
  const { businessId, customerPhone, serviceName, scheduledAt, employeeName } = body;

  if (!businessId || !customerPhone || !serviceName || !scheduledAt) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const service = await prisma.service.findFirst({
    where: { businessId, name: serviceName, isActive: true },
  });

  if (!service) {
    return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  }

  let employeeId: string | undefined;
  if (employeeName) {
    const employee = await prisma.employee.findFirst({
      where: { businessId, name: employeeName, isActive: true },
    });
    employeeId = employee?.id;
  }

  const customer = await prisma.customer.upsert({
    where: {
      whatsappPhone_businessId: { whatsappPhone: customerPhone, businessId },
    },
    create: { businessId, whatsappPhone: customerPhone },
    update: {},
  });

  const start = new Date(scheduledAt);
  const endsAt = addMinutes(start, service.durationMin);

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
    },
  });

  const fechaLabel = formatInTimeZone(start, TZ, "EEEE d 'de' MMMM · h:mm a", {
    locale: es,
  });

  if (appointment.business.owner.email) {
    sendNewAppointmentEmail({
      to: appointment.business.owner.email,
      businessName: appointment.business.name,
      customerPhone,
      customerName: customer.name,
      serviceName: appointment.service.name,
      scheduledAt: fechaLabel,
    }).catch(console.error);
  }

  return NextResponse.json(appointment);
});
