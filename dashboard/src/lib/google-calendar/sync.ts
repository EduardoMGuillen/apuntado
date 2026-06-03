import type { Appointment, Business, Customer, Service } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveBusinessTimezone } from "@/lib/timezones";
import { getCalendarApi } from "./client";
import { invalidateGoogleBusyCache } from "./busy";

type AppointmentWithRelations = Appointment & {
  business: Business;
  service: Service;
  customer: Customer;
};

function buildEventDescription(apt: AppointmentWithRelations): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const lines = [
    `Cliente: ${apt.customer.name || "—"}`,
    `WhatsApp: ${apt.customer.whatsappPhone}`,
    apt.customer.clientType ? `Tipo: ${apt.customer.clientType}` : "",
    `Servicio: ${apt.service.name}`,
    `ID cita: ${apt.id}`,
    appUrl ? `Panel: ${appUrl}/app/${apt.businessId}/citas` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

export async function syncAppointmentToGoogle(
  appointmentId: string
): Promise<void> {
  const apt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { business: true, service: true, customer: true },
  });

  if (!apt || apt.status === "cancelled") return;
  if (apt.googleEventId) return;

  const api = await getCalendarApi(apt.businessId);
  if (!api) return;

  const settings = await prisma.businessSettings.findUnique({
    where: { businessId: apt.businessId },
    select: { timezone: true },
  });
  const timezone = resolveBusinessTimezone(settings?.timezone);

  try {
    const res = await api.calendar.events.insert({
      calendarId: api.connection.calendarId,
      requestBody: {
        summary: `${apt.service.name} — ${apt.customer.name || "Cliente"}`,
        description: buildEventDescription(apt),
        start: {
          dateTime: apt.scheduledAt.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: apt.endsAt.toISOString(),
          timeZone: timezone,
        },
        extendedProperties: {
          private: {
            apuntadoAppointmentId: apt.id,
            apuntadoBusinessId: apt.businessId,
          },
        },
      },
    });

    await prisma.appointment.update({
      where: { id: apt.id },
      data: {
        googleEventId: res.data.id ?? null,
        googleSyncError: null,
      },
    });
    await invalidateGoogleBusyCache(apt.businessId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de sincronización";
    console.error("[GoogleCalendar] insert event failed:", err);
    await prisma.appointment.update({
      where: { id: apt.id },
      data: { googleSyncError: message.slice(0, 500) },
    });
  }
}

export async function updateGoogleEventForAppointment(
  appointmentId: string
): Promise<void> {
  const apt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { business: true, service: true, customer: true },
  });
  if (!apt?.googleEventId) {
    if (apt && apt.status !== "cancelled") {
      await syncAppointmentToGoogle(appointmentId);
    }
    return;
  }

  const api = await getCalendarApi(apt.businessId);
  if (!api) return;

  const settings = await prisma.businessSettings.findUnique({
    where: { businessId: apt.businessId },
    select: { timezone: true },
  });
  const timezone = resolveBusinessTimezone(settings?.timezone);

  if (apt.status === "cancelled") {
    await deleteGoogleEventForAppointment(appointmentId);
    return;
  }

  try {
    await api.calendar.events.patch({
      calendarId: api.connection.calendarId,
      eventId: apt.googleEventId,
      requestBody: {
        summary: `${apt.service.name} — ${apt.customer.name || "Cliente"}`,
        description: buildEventDescription(apt),
        start: {
          dateTime: apt.scheduledAt.toISOString(),
          timeZone: timezone,
        },
        end: {
          dateTime: apt.endsAt.toISOString(),
          timeZone: timezone,
        },
      },
    });
    await prisma.appointment.update({
      where: { id: apt.id },
      data: { googleSyncError: null },
    });
    await invalidateGoogleBusyCache(apt.businessId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de actualización";
    console.error("[GoogleCalendar] patch event failed:", err);
    await prisma.appointment.update({
      where: { id: apt.id },
      data: { googleSyncError: message.slice(0, 500) },
    });
  }
}

export async function deleteGoogleEventForAppointment(
  appointmentId: string
): Promise<void> {
  const apt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!apt?.googleEventId) return;

  const api = await getCalendarApi(apt.businessId);
  if (!api) return;

  try {
    await api.calendar.events.delete({
      calendarId: api.connection.calendarId,
      eventId: apt.googleEventId,
    });
  } catch (err) {
    console.error("[GoogleCalendar] delete event failed:", err);
  }

  await prisma.appointment.update({
    where: { id: apt.id },
    data: { googleEventId: null, googleSyncError: null },
  });
  await invalidateGoogleBusyCache(apt.businessId);
}

export async function backfillAppointmentsToGoogle(
  businessId: string
): Promise<{ synced: number; failed: number }> {
  const now = new Date();
  const appointments = await prisma.appointment.findMany({
    where: {
      businessId,
      googleEventId: null,
      status: { in: ["pending", "confirmed"] },
      scheduledAt: { gte: now },
    },
    orderBy: { scheduledAt: "asc" },
    take: 200,
  });

  let synced = 0;
  let failed = 0;
  for (const apt of appointments) {
    await syncAppointmentToGoogle(apt.id);
    const updated = await prisma.appointment.findUnique({
      where: { id: apt.id },
      select: { googleEventId: true, googleSyncError: true },
    });
    if (updated?.googleEventId) synced++;
    else if (updated?.googleSyncError) failed++;
  }
  return { synced, failed };
}
