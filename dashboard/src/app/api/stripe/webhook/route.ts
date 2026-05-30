import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { PLANS, type PlanId } from "@/lib/plans";
import { sendSubscriptionActiveEmail } from "@/lib/resend";

export const runtime = "nodejs";

function getSubscriptionPeriodEnd(stripeSub: Stripe.Subscription): Date | null {
  const raw = stripeSub as Stripe.Subscription & { current_period_end?: number };
  if (raw.current_period_end) {
    return new Date(raw.current_period_end * 1000);
  }
  return null;
}

function getTrialEnd(stripeSub: Stripe.Subscription): Date | null {
  const raw = stripeSub as Stripe.Subscription & { trial_end?: number | null };
  if (raw.trial_end) {
    return new Date(raw.trial_end * 1000);
  }
  return null;
}

async function syncSubscription(
  stripeSub: Stripe.Subscription,
  businessId: string,
  plan: PlanId
) {
  const trialEndsAt = getTrialEnd(stripeSub);

  let status: string;
  if (stripeSub.status === "trialing" || stripeSub.status === "active") {
    status = "active";
  } else if (stripeSub.status === "past_due") {
    status = "past_due";
  } else if (stripeSub.status === "canceled" || stripeSub.status === "unpaid") {
    status = "canceled";
  } else {
    status = stripeSub.status;
  }

  await prisma.subscription.update({
    where: { businessId },
    data: {
      plan,
      status,
      stripeSubscriptionId: stripeSub.id,
      trialEndsAt: trialEndsAt,
      currentPeriodEnd: getSubscriptionPeriodEnd(stripeSub),
    },
  });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET no configurado" },
      { status: 500 }
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Sin firma" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[Stripe webhook] Firma inválida:", err);
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const businessId = session.metadata?.businessId;
        const plan = (session.metadata?.plan || "basic") as PlanId;

        if (!businessId || session.mode !== "subscription") break;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (!subscriptionId) break;

        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscription(stripeSub, businessId, plan);

        const business = await prisma.business.findUnique({
          where: { id: businessId },
          include: { owner: true },
        });

        if (business?.owner.email) {
          const inTrial = stripeSub.status === "trialing";
          await sendSubscriptionActiveEmail({
            to: business.owner.email,
            name: business.owner.name,
            planName: inTrial
              ? `Prueba ${PLANS[plan].name}`
              : PLANS[plan].name,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const businessId = stripeSub.metadata?.businessId;
        const plan = (stripeSub.metadata?.plan || "basic") as PlanId;
        if (businessId) await syncSubscription(stripeSub, businessId, plan);
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const businessId = stripeSub.metadata?.businessId;
        if (!businessId) break;

        await prisma.subscription.update({
          where: { businessId },
          data: {
            status: "canceled",
            stripeSubscriptionId: null,
            trialEndsAt: null,
            currentPeriodEnd: null,
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const inv = invoice as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const subId =
          typeof inv.subscription === "string"
            ? inv.subscription
            : inv.subscription?.id ?? null;

        if (!subId) break;

        const stripeSub = await stripe.subscriptions.retrieve(subId);
        const businessId = stripeSub.metadata?.businessId;
        if (!businessId) break;

        await prisma.subscription.update({
          where: { businessId },
          data: { status: "past_due" },
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[Stripe webhook]", event.type, err);
    return NextResponse.json({ error: "Error procesando evento" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
