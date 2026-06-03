import { NextResponse } from "next/server";
import { requireBusinessApiAccess } from "@/lib/api-business-guard";
import { prisma } from "@/lib/prisma";
import { getSubscriptionAccess } from "@/lib/subscription";
import { signOAuthState } from "@/lib/token-crypto";
import {
  buildGoogleCalendarAuthUrl,
} from "@/lib/google-calendar/oauth";
import {
  canUseGoogleCalendar,
  getGoogleOAuthClientConfig,
} from "@/lib/google-calendar/config";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const access = await requireBusinessApiAccess(params.id);
  if (access.response) return access.response;

  const business = await prisma.business.findUnique({
    where: { id: params.id },
    include: { subscription: true },
  });
  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const sub = getSubscriptionAccess(business.subscription);
  if (!canUseGoogleCalendar(sub)) {
    return NextResponse.json(
      {
        error:
          "Google Calendar está disponible con suscripción activa (Básico o Pro).",
      },
      { status: 403 }
    );
  }

  if (!getGoogleOAuthClientConfig()) {
    return NextResponse.json(
      { error: "Integración Google no configurada en el servidor." },
      { status: 503 }
    );
  }

  const state = signOAuthState({
    businessId: params.id,
    userId: access.session!.user!.id!,
    ts: Date.now(),
  });

  const url = buildGoogleCalendarAuthUrl(state);
  if (!url) {
    return NextResponse.json({ error: "No se pudo iniciar OAuth" }, { status: 500 });
  }

  return NextResponse.redirect(url);
}
