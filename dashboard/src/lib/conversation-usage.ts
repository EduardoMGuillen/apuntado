import { prisma } from "@/lib/prisma";
import { buildPhoneVariants } from "@/lib/customer-context";
import { reconcileCustomerPhone } from "@/lib/customer-phone";
import {
  formatCurrentMonthLabel,
  getCalendarMonthRangeUtc,
} from "@/lib/business-datetime";
import {
  BASIC_MONTHLY_CONVERSATION_LIMIT,
  planHasConversationLimit,
} from "@/lib/plans";

export type ConversationUsage = {
  used: number;
  limit: number | null;
  limitReached: boolean;
  monthLabel: string;
  applies: boolean;
};

/** Chats distintos (teléfono) con al menos un mensaje del cliente en el mes. */
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

export async function getConversationUsage(
  businessId: string,
  plan: string,
  timezone: string,
  customerPhone?: string
): Promise<ConversationUsage> {
  const used = await countMonthlyClientConversations(businessId, timezone);
  const monthLabel = formatCurrentMonthLabel(timezone);
  const applies = planHasConversationLimit(plan);

  if (!applies) {
    return {
      used,
      limit: null,
      limitReached: false,
      monthLabel,
      applies: false,
    };
  }

  const alreadyKnown =
    customerPhone != null
      ? await clientAlreadyCountedThisMonth(businessId, customerPhone, timezone)
      : false;

  const limitReached =
    used >= BASIC_MONTHLY_CONVERSATION_LIMIT && !alreadyKnown;

  return {
    used,
    limit: BASIC_MONTHLY_CONVERSATION_LIMIT,
    limitReached,
    monthLabel,
    applies: true,
  };
}
