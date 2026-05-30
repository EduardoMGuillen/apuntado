import { prisma } from "@/lib/prisma";
import { TRIAL_DAYS, type PlanId } from "@/lib/plans";

/** Un solo plan por negocio: actualiza la misma fila Subscription. */
export async function activateSimulatedSubscription(
  businessId: string,
  plan: PlanId,
  options: {
    withTrial?: boolean;
    trialEndsAt?: Date;
  } = {}
) {
  const withTrial = options.withTrial ?? false;
  const now = new Date();

  const trialEndsAt =
    options.trialEndsAt ??
    (withTrial
      ? new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
      : null);

  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return prisma.subscription.update({
    where: { businessId },
    data: {
      plan,
      status: "active",
      stripeCustomerId: `sim_cus_${businessId}`,
      stripeSubscriptionId: `sim_sub_${businessId}`,
      trialEndsAt,
      currentPeriodEnd: periodEnd,
      trialReminderSent: false,
    },
  });
}
