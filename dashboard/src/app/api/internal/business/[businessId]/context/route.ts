import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyVpsSecret } from "@/lib/bot-prompt";
import { buildAvailabilityText, buildSystemPrompt } from "@/lib/bot-prompt";
import { fetchWebsiteContent } from "@/lib/website-fetch";
import { getSubscriptionAccess } from "@/lib/subscription";
import { resolveBusinessTimezone } from "@/lib/timezones";
import { getBusinessDayRangeUtc } from "@/lib/business-datetime";
import {
  buildCustomerAppointmentsPromptSection,
  resolveCustomerForContext,
} from "@/lib/customer-context";
import { getMonthlyPlanUsage } from "@/lib/plan-usage";
import { parseConversationTone } from "@/lib/conversation-tones";
import { getMergedAvailabilityBusy } from "@/lib/google-calendar/availability";
import { getCalendarConnection } from "@/lib/google-calendar/client";

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

  try {
    return await buildContextResponse(businessId, phone);
  } catch (err) {
    console.error(`[Context] Error (${businessId}):`, err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function buildContextResponse(businessId: string, phone: string) {
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

  const timezone = resolveBusinessTimezone(business.settings?.timezone);
  const { customer, appointments: customerAppointments } =
    await resolveCustomerForContext(businessId, phone, timezone);
  const gcalConn = await getCalendarConnection(businessId);
  const { start: rangeStart, end: rangeEnd } = getBusinessDayRangeUtc(timezone, 3);
  let busySlots: { scheduledAt: Date; endsAt: Date }[];
  if (gcalConn) {
    try {
      busySlots = await getMergedAvailabilityBusy(businessId, timezone, 3);
    } catch (err) {
      console.error(
        `[Context] Google Calendar no disponible (${businessId}):`,
        err
      );
      busySlots = (
        await prisma.appointment.findMany({
          where: {
            businessId,
            scheduledAt: { gte: rangeStart, lt: rangeEnd },
            status: { in: ["pending", "confirmed"] },
          },
          select: { scheduledAt: true, endsAt: true },
        })
      ).map((r) => ({ scheduledAt: r.scheduledAt, endsAt: r.endsAt }));
    }
  } else {
    busySlots = (
      await prisma.appointment.findMany({
        where: {
          businessId,
          scheduledAt: { gte: rangeStart, lt: rangeEnd },
          status: { in: ["pending", "confirmed"] },
        },
        select: { scheduledAt: true, endsAt: true },
      })
    ).map((r) => ({ scheduledAt: r.scheduledAt, endsAt: r.endsAt }));
  }

  const availability = buildAvailabilityText(
    business.schedules,
    busySlots,
    timezone,
    { includesGoogleCalendar: !!gcalConn }
  );
  const websiteContent = await fetchWebsiteContent(business.settings?.websiteUrl);
  const systemPrompt = buildSystemPrompt(
    { ...business, websiteContent },
    availability,
    timezone
  );
  const customerProfile = customer
    ? [
        "DATOS DEL CLIENTE ACTUAL:",
        `- Nombre: ${customer.name?.trim() || "no registrado"}`,
        `- Tipo: ${customer.clientType?.trim() || "no registrado"}`,
        "- Si un dato ya existe, no lo vuelvas a preguntar.",
      ].join("\n")
    : "DATOS DEL CLIENTE ACTUAL:\n- Cliente nuevo en este chat.";

  const appointmentsSection = buildCustomerAppointmentsPromptSection(
    customerAppointments,
    timezone,
    customer
  );

  const enrichedPrompt = `${systemPrompt}\n\n${customerProfile}\n\n${appointmentsSection}`;
  const subscriptionAccess = getSubscriptionAccess(business.subscription);
  const usage = await getMonthlyPlanUsage(
    businessId,
    subscriptionAccess.plan,
    timezone,
    subscriptionAccess.reason,
    phone
  );

  return NextResponse.json({
    id: business.id,
    name: business.name,
    type: business.type,
    phone: business.phone,
    city: business.city,
    manualTakeover: customer?.manualTakeover ?? false,
    takenOverAt: customer?.takenOverAt?.toISOString() ?? null,
    subscriptionActive: subscriptionAccess.active,
    subscriptionPlan: subscriptionAccess.plan,
    usageTier: usage.tier,
    botBlocked: usage.botBlocked,
    blockReason: usage.blockReason,
    conversationLimitReached: usage.conversations.limitReached,
    aiCallLimitReached: usage.aiCalls.limitReached,
    conversationUsage: {
      used: usage.conversations.used,
      limit: usage.conversations.limit,
      monthLabel: usage.monthLabel,
      applies: usage.applies,
    },
    aiCallUsage: {
      used: usage.aiCalls.used,
      limit: usage.aiCalls.limit,
      monthLabel: usage.monthLabel,
    },
    systemPrompt: enrichedPrompt,
    availability,
    timezone,
    conversationTone: parseConversationTone(
      business.settings?.conversationTone
    ),
  });
}
