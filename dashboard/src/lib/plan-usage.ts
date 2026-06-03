import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { buildPhoneVariants } from "@/lib/customer-context";
import { reconcileCustomerPhone } from "@/lib/customer-phone";
import {
  formatCurrentMonthLabel,
  getCalendarMonthRangeUtc,
} from "@/lib/business-datetime";
import {
  getUsageLimitsForTier,
  resolveUsageTier,
  USAGE_WARN_RATIO,
  type UsageTier,
} from "@/lib/plans";
import { parseSuperAdminEmails } from "@/lib/roles";
import { sendUsageAlertEmail } from "@/lib/emails/send";
import { getSubscriptionAccess } from "@/lib/subscription";

export type UsageCounter = {
  used: number;
  limit: number | null;
  warnThreshold: number | null;
  warn: boolean;
  limitReached: boolean;
};

export type MonthlyPlanUsage = {
  tier: UsageTier;
  monthLabel: string;
  periodKey: string;
  applies: boolean;
  conversations: UsageCounter;
  aiCalls: UsageCounter;
  botBlocked: boolean;
  blockReason: "conversation" | "ai" | null;
};

export function getPeriodKey(timezone: string, base: Date = new Date()): string {
  return formatInTimeZone(base, timezone, "yyyy-MM");
}

export async function countMonthlyClientConversations(
  businessId: string,
  timezone: string
): Promise<number> {
  const { start, end } = getCalendarMonthRangeUtc(timezone);
  const rows = await prisma.whatsappMessage.findMany({
    where: {
      businessId,
      fromClient: true,
      createdAt: { gte: start, lt: end },
    },
    select: { customerPhone: true },
    distinct: ["customerPhone"],
  });
  return rows.length;
}

export async function clientAlreadyCountedThisMonth(
  businessId: string,
  rawPhone: string,
  timezone: string
): Promise<boolean> {
  const canonical = await reconcileCustomerPhone(businessId, rawPhone);
  const variants = Array.from(
    new Set([
      ...buildPhoneVariants(canonical),
      ...buildPhoneVariants(rawPhone),
    ])
  );
  const { start, end } = getCalendarMonthRangeUtc(timezone);
  const existing = await prisma.whatsappMessage.findFirst({
    where: {
      businessId,
      fromClient: true,
      createdAt: { gte: start, lt: end },
      customerPhone: { in: variants },
    },
    select: { id: true },
  });
  return !!existing;
}

async function getAiCallCount(
  businessId: string,
  periodKey: string
): Promise<number> {
  const row = await prisma.businessMonthlyUsage.findUnique({
    where: {
      businessId_periodKey: { businessId, periodKey },
    },
    select: { aiCallCount: true },
  });
  return row?.aiCallCount ?? 0;
}

function buildCounter(used: number, limit: number | null): UsageCounter {
  if (limit == null) {
    return {
      used,
      limit: null,
      warnThreshold: null,
      warn: false,
      limitReached: false,
    };
  }
  const warnThreshold = Math.floor(limit * USAGE_WARN_RATIO);
  return {
    used,
    limit,
    warnThreshold,
    warn: used >= warnThreshold && used < limit,
    limitReached: used >= limit,
  };
}

export async function getMonthlyPlanUsage(
  businessId: string,
  plan: string,
  timezone: string,
  subscriptionReason?: string,
  customerPhone?: string
): Promise<MonthlyPlanUsage> {
  const tier = resolveUsageTier(plan, subscriptionReason);
  const limits = getUsageLimitsForTier(tier);
  const monthLabel = formatCurrentMonthLabel(timezone);
  const periodKey = getPeriodKey(timezone);
  const applies = tier !== "pro";

  const [convUsed, aiUsed] = await Promise.all([
    countMonthlyClientConversations(businessId, timezone),
    getAiCallCount(businessId, periodKey),
  ]);

  const conversations = buildCounter(convUsed, limits.conversations);
  const aiCalls = buildCounter(aiUsed, limits.aiCalls);

  let conversationLimitReached = false;
  if (limits.conversations != null) {
    const alreadyKnown =
      customerPhone != null
        ? await clientAlreadyCountedThisMonth(
            businessId,
            customerPhone,
            timezone
          )
        : false;
    conversationLimitReached =
      convUsed >= limits.conversations && !alreadyKnown;
  }

  const aiCallLimitReached =
    limits.aiCalls != null && aiUsed >= limits.aiCalls;

  let blockReason: "conversation" | "ai" | null = null;
  if (conversationLimitReached) blockReason = "conversation";
  else if (aiCallLimitReached) blockReason = "ai";

  return {
    tier,
    monthLabel,
    periodKey,
    applies,
    conversations: {
      ...conversations,
      limitReached: conversationLimitReached,
    },
    aiCalls: {
      ...aiCalls,
      limitReached: aiCallLimitReached,
    },
    botBlocked: blockReason != null,
    blockReason,
  };
}

async function maybeSendUsageAlerts(
  businessId: string,
  businessName: string,
  tier: UsageTier,
  periodKey: string,
  conversations: UsageCounter,
  aiCalls: UsageCounter
): Promise<void> {
  const admins = parseSuperAdminEmails();
  if (admins.length === 0) return;

  const row = await prisma.businessMonthlyUsage.findUnique({
    where: { businessId_periodKey: { businessId, periodKey } },
  });

  const hitWarn =
    (conversations.warn || aiCalls.warn) && !row?.alertWarnSent;
  const hitLimit =
    (conversations.limitReached || aiCalls.limitReached) &&
    !row?.alertLimitSent;

  if (!hitWarn && !hitLimit) return;

  const subject = hitLimit
    ? `[Apuntado] Límite de uso — ${businessName}`
    : `[Apuntado] Uso alto (85%) — ${businessName}`;

  const html = `
    <p><strong>Negocio:</strong> ${businessName} (${businessId})</p>
    <p><strong>Plan:</strong> ${tier}</p>
    <p><strong>Periodo:</strong> ${periodKey}</p>
    <p><strong>Conversaciones:</strong> ${conversations.used} / ${conversations.limit ?? "∞"}</p>
    <p><strong>Respuestas IA:</strong> ${aiCalls.used} / ${aiCalls.limit ?? "∞"}</p>
    <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "https://apuntado.app"}/admin/usage">Ver panel de uso</a></p>
  `;

  for (const to of admins) {
    await sendUsageAlertEmail({ to, subject, html });
  }

  await prisma.businessMonthlyUsage.upsert({
    where: { businessId_periodKey: { businessId, periodKey } },
    create: {
      businessId,
      periodKey,
      aiCallCount: aiCalls.used,
      alertWarnSent: hitWarn || hitLimit,
      alertLimitSent: hitLimit,
    },
    update: {
      ...(hitWarn ? { alertWarnSent: true } : {}),
      ...(hitLimit ? { alertLimitSent: true } : {}),
    },
  });
}

/** Llamar tras cada respuesta exitosa con Anthropic en el VPS. */
export async function recordAiCall(
  businessId: string,
  timezone: string
): Promise<{ count: number }> {
  const periodKey = getPeriodKey(timezone);
  const row = await prisma.businessMonthlyUsage.upsert({
    where: { businessId_periodKey: { businessId, periodKey } },
    create: { businessId, periodKey, aiCallCount: 1 },
    update: { aiCallCount: { increment: 1 } },
  });

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { subscription: true, settings: true },
  });
  if (!business) return { count: row.aiCallCount };

  const subAccess = getSubscriptionAccess(business.subscription);
  const tier = resolveUsageTier(subAccess.plan, subAccess.reason);
  const limits = getUsageLimitsForTier(tier);
  const convUsed = await countMonthlyClientConversations(
    businessId,
    timezone
  );
  const conversations = buildCounter(convUsed, limits.conversations);
  const aiCalls = buildCounter(row.aiCallCount, limits.aiCalls);

  void maybeSendUsageAlerts(
    businessId,
    business.name,
    tier,
    periodKey,
    conversations,
    aiCalls
  );

  return { count: row.aiCallCount };
}

/** Estadísticas agregadas para super admin. */
export async function getAdminUsageOverview(): Promise<
  {
    businessId: string;
    businessName: string;
    city: string;
    plan: string;
    tier: UsageTier;
    ownerEmail: string;
    whatsappConnected: boolean;
    periodKey: string;
    conversationsUsed: number;
    conversationsLimit: number | null;
    aiCallsUsed: number;
    aiCallsLimit: number | null;
    atRisk: boolean;
    atLimit: boolean;
  }[]
> {
  const businesses = await prisma.business.findMany({
    orderBy: { name: "asc" },
    include: {
      owner: { select: { email: true } },
      subscription: true,
      whatsappSession: true,
      settings: { select: { timezone: true } },
    },
  });

  const results = await Promise.all(
    businesses.map(async (b) => {
      const timezone = b.settings?.timezone ?? "America/Tegucigalpa";
      const subAccess = getSubscriptionAccess(b.subscription);
      const usage = await getMonthlyPlanUsage(
        b.id,
        subAccess.plan,
        timezone,
        subAccess.reason
      );
      return {
        businessId: b.id,
        businessName: b.name,
        city: b.city,
        plan: subAccess.plan,
        tier: usage.tier,
        ownerEmail: b.owner.email,
        whatsappConnected: b.whatsappSession?.connected ?? false,
        periodKey: usage.periodKey,
        conversationsUsed: usage.conversations.used,
        conversationsLimit: usage.conversations.limit,
        aiCallsUsed: usage.aiCalls.used,
        aiCallsLimit: usage.aiCalls.limit,
        atRisk: usage.conversations.warn || usage.aiCalls.warn,
        atLimit: usage.conversations.limitReached || usage.aiCalls.limitReached,
      };
    })
  );

  return results;
}
