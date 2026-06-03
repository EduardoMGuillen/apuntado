import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireBusinessApiAccess } from "@/lib/api-business-guard";
import { prisma } from "@/lib/prisma";
import { getSubscriptionAccess } from "@/lib/subscription";
import {
  canUseGoogleCalendar,
  getGoogleOAuthClientConfig,
} from "@/lib/google-calendar/config";
import { revokeGoogleConnection } from "@/lib/google-calendar/oauth";
import { backfillAppointmentsToGoogle } from "@/lib/google-calendar/sync";
import { invalidateGoogleBusyCache } from "@/lib/google-calendar/busy";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireBusinessApiAccess(params.id);
  if (access.response) return access.response;

  const business = await prisma.business.findUnique({
    where: { id: params.id },
    include: { subscription: true, googleCalendar: true },
  });
  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const sub = getSubscriptionAccess(business.subscription);
  const conn = business.googleCalendar;

  return NextResponse.json({
    featureAvailable: canUseGoogleCalendar(sub),
    oauthConfigured: !!getGoogleOAuthClientConfig(),
    connected: !!conn,
    googleEmail: conn?.googleEmail ?? null,
    calendarId: conn?.calendarId ?? null,
    calendarSummary: conn?.calendarSummary ?? null,
  });
}

const patchSchema = z.object({
  calendarId: z.string().min(1),
  calendarSummary: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireBusinessApiAccess(params.id);
  if (access.response) return access.response;

  const business = await prisma.business.findUnique({
    where: { id: params.id },
    include: { subscription: true, googleCalendar: true },
  });
  if (!business?.googleCalendar) {
    return NextResponse.json({ error: "No conectado" }, { status: 400 });
  }

  const sub = getSubscriptionAccess(business.subscription);
  if (!canUseGoogleCalendar(sub)) {
    return NextResponse.json({ error: "Suscripción inactiva" }, { status: 403 });
  }

  try {
    const body = patchSchema.parse(await req.json());
    await prisma.googleCalendarConnection.update({
      where: { businessId: params.id },
      data: {
        calendarId: body.calendarId,
        calendarSummary: body.calendarSummary ?? body.calendarId,
        busyCacheJson: null,
        busyCacheExpiresAt: null,
      },
    });
    await invalidateGoogleBusyCache(params.id);
    backfillAppointmentsToGoogle(params.id).catch(console.error);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireBusinessApiAccess(params.id);
  if (access.response) return access.response;

  await revokeGoogleConnection(params.id);
  return NextResponse.json({ ok: true });
}
