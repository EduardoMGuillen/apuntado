import type { Subscription } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { isStripeConfigured, isSimulatedStripeId } from "@/lib/stripe-config";
import { activateSimulatedSubscription } from "@/lib/subscription-simulate";
import { getStripePriceId, TRIAL_DAYS, type PlanId } from "@/lib/plans";
import { getSubscriptionAccess } from "@/lib/subscription";

export class PlanChangeError extends Error {
  constructor(
    message: string,
    public code: "SAME_PLAN" | "NOT_FOUND"
  ) {
    super(message);
    this.name = "PlanChangeError";
  }
}

export function assertSinglePlanChange(
  subscription: Subscription | null | undefined,
  targetPlan: PlanId
): void {
  if (!subscription) return;

  const access = getSubscriptionAccess(subscription);

  if (
    access.active &&
    subscription.plan === targetPlan &&
    subscription.stripeSubscriptionId
  ) {
    throw new PlanChangeError("Ya tenés este plan activo.", "SAME_PLAN");
  }
}

export type PlanChangeResult =
  | { mode: "simulated"; url: string }
  | { mode: "stripe_checkout"; url: string }
  | { mode: "stripe_updated"; url: string };

export async function changeBusinessPlan(
  businessId: string,
  plan: PlanId,
  options: { withTrial?: boolean; appUrl: string }
): Promise<PlanChangeResult> {
  const withTrial = options.withTrial ?? false;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { subscription: true, owner: { select: { email: true, name: true } } },
  });

  if (!business) {
    throw new PlanChangeError("Negocio no encontrado", "NOT_FOUND");
  }

  assertSinglePlanChange(business.subscription, plan);

  const sub = business.subscription;
  const preserveTrial =
    !!sub?.trialEndsAt &&
    sub.trialEndsAt > new Date() &&
    sub.status === "active" &&
    !!sub.stripeSubscriptionId;

  if (!isStripeConfigured()) {
    await activateSimulatedSubscription(businessId, plan, {
      withTrial: withTrial || preserveTrial,
      trialEndsAt: preserveTrial ? sub!.trialEndsAt! : undefined,
    });

    const redirectPath =
      withTrial && !preserveTrial
        ? `/app/${businessId}/whatsapp?trial=ok&simulated=1`
        : `/app/${businessId}/suscripcion?success=1&simulated=1`;

    return {
      mode: "simulated",
      url: `${options.appUrl}${redirectPath}`,
    };
  }

  const stripe = getStripe();
  const priceId = getStripePriceId(plan);

  const existingSubId = sub?.stripeSubscriptionId;
  const hasRealStripeSub =
    existingSubId && !isSimulatedStripeId(existingSubId);

  if (hasRealStripeSub) {
    const stripeSub = await stripe.subscriptions.retrieve(existingSubId);
    const itemId = stripeSub.items.data[0]?.id;

    if (!itemId) {
      throw new Error("Suscripción de Stripe sin ítems");
    }

    await stripe.subscriptions.update(existingSubId, {
      items: [{ id: itemId, price: priceId }],
      metadata: { businessId, plan },
      proration_behavior: "create_prorations",
    });

    const trialEndsAt =
      stripeSub.status === "trialing" && stripeSub.trial_end
        ? new Date(stripeSub.trial_end * 1000)
        : sub?.trialEndsAt;

    await prisma.subscription.update({
      where: { businessId },
      data: {
        plan,
        status: "active",
        trialEndsAt,
      },
    });

    return {
      mode: "stripe_updated",
      url: `${options.appUrl}/app/${businessId}/suscripcion?success=1&plan_changed=1`,
    };
  }

  let customerId = sub?.stripeCustomerId;
  if (!customerId || isSimulatedStripeId(customerId)) {
    const customer = await stripe.customers.create({
      email: business.owner.email,
      name: business.name,
      metadata: { businessId, userId: business.ownerId },
    });
    customerId = customer.id;
    await prisma.subscription.upsert({
      where: { businessId },
      create: { businessId, stripeCustomerId: customerId, plan, status: "pending" },
      update: { stripeCustomerId: customerId, plan },
    });
  } else {
    await prisma.subscription.update({
      where: { businessId },
      data: { plan },
    });
  }

  const successUrl = withTrial
    ? `${options.appUrl}/app/${businessId}/whatsapp?trial=ok`
    : `${options.appUrl}/app/${businessId}/suscripcion?success=1`;

  const cancelUrl = withTrial
    ? `${options.appUrl}/app/${businessId}/suscripcion?canceled=1&needs_card=1`
    : `${options.appUrl}/app/${businessId}/suscripcion?canceled=1`;

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { businessId, plan, withTrial: withTrial ? "1" : "0" },
    subscription_data: {
      ...(withTrial ? { trial_period_days: TRIAL_DAYS } : {}),
      metadata: { businessId, plan },
    },
    payment_method_collection: "always",
    allow_promotion_codes: !withTrial,
  });

  return {
    mode: "stripe_checkout",
    url: checkoutSession.url!,
  };
}
