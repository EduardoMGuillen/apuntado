import { subDays } from "date-fns";
import { prisma } from "@/lib/prisma";

/** Días sin mensajes (cliente o negocio) antes de que el bot retome el chat. */
export const MANUAL_TAKEOVER_IDLE_DAYS = 4;

/**
 * @param excludeLatestMessage Si true, ignora el mensaje más reciente (p. ej. entrante ya guardado).
 */
export async function isManualTakeoverIdle(
  businessId: string,
  customerPhone: string,
  options?: { excludeLatestMessage?: boolean }
): Promise<boolean> {
  const cutoff = subDays(new Date(), MANUAL_TAKEOVER_IDLE_DAYS);
  const excludeLatest = options?.excludeLatestMessage ?? false;

  const customer = await prisma.customer.findUnique({
    where: {
      whatsappPhone_businessId: { whatsappPhone: customerPhone, businessId },
    },
    select: { manualTakeover: true, takenOverAt: true },
  });

  if (!customer?.manualTakeover) return false;

  const recent = await prisma.whatsappMessage.findMany({
    where: { businessId, customerPhone },
    orderBy: { createdAt: "desc" },
    take: excludeLatest ? 2 : 1,
    select: { createdAt: true },
  });

  const lastActivity = excludeLatest
    ? (recent[1]?.createdAt ?? customer.takenOverAt)
    : (recent[0]?.createdAt ?? customer.takenOverAt);

  return !lastActivity || lastActivity < cutoff;
}

export async function findIdleManualTakeovers(): Promise<
  { businessId: string; customerPhone: string }[]
> {
  const customers = await prisma.customer.findMany({
    where: { manualTakeover: true },
    select: {
      businessId: true,
      whatsappPhone: true,
    },
  });

  const expired: { businessId: string; customerPhone: string }[] = [];

  for (const customer of customers) {
    const idle = await isManualTakeoverIdle(
      customer.businessId,
      customer.whatsappPhone
    );
    if (idle) {
      expired.push({
        businessId: customer.businessId,
        customerPhone: customer.whatsappPhone,
      });
    }
  }

  return expired;
}
