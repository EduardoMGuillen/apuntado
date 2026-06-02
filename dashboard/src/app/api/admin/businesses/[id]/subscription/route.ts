import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isSuperAdminSession } from "@/lib/business-access";
import { getStripe } from "@/lib/stripe";
import { isSimulatedStripeId, isStripeConfigured } from "@/lib/stripe-config";

const editSchema = z.object({
  action: z.literal("edit").optional(),
  plan: z.enum(["trial", "basic", "pro"]).optional(),
  status: z.enum(["active", "past_due", "canceled", "expired"]).optional(),
  trialEndsAt: z.string().nullable().optional(),
});

const extendSchema = z.object({
  action: z.literal("extend_trial_15"),
});

const patchSchema = z.union([editSchema, extendSchema]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user?.id || !isSuperAdminSession(session)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const business = await prisma.business.findUnique({
    where: { id: params.id },
    include: { subscription: true },
  });

  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);

    if (data.action === "extend_trial_15") {
      const now = new Date();
      const currentTrial = business.subscription?.trialEndsAt;
      const baseDate =
        currentTrial && currentTrial > now ? currentTrial : now;
      const nextTrialEndsAt = new Date(baseDate.getTime() + 15 * 24 * 60 * 60 * 1000);

      const subscription = business.subscription
        ? await prisma.subscription.update({
            where: { businessId: business.id },
            data: {
              trialEndsAt: nextTrialEndsAt,
              status: "active",
            },
          })
        : await prisma.subscription.create({
            data: {
              businessId: business.id,
              plan: "trial",
              status: "active",
              trialEndsAt: nextTrialEndsAt,
            },
          });

      let stripeSynced = false;
      let stripeNote: string | null = null;

      if (
        subscription.stripeSubscriptionId &&
        !isSimulatedStripeId(subscription.stripeSubscriptionId) &&
        isStripeConfigured()
      ) {
        try {
          const stripe = getStripe();
          const stripeSub = await stripe.subscriptions.retrieve(
            subscription.stripeSubscriptionId
          );
          if (stripeSub.status === "trialing") {
            await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
              trial_end: Math.floor(nextTrialEndsAt.getTime() / 1000),
              proration_behavior: "none",
            });
            stripeSynced = true;
          } else {
            stripeNote = "La suscripción de Stripe no está en trialing; no se modificó trial_end en Stripe.";
          }
        } catch (err) {
          console.error("[Admin subscription] Error sincronizando trial con Stripe:", err);
          stripeNote = "No se pudo sincronizar el trial en Stripe.";
        }
      }

      return NextResponse.json({
        ok: true,
        trialEndsAt: nextTrialEndsAt.toISOString(),
        stripeSynced,
        stripeNote,
      });
    }

    const trialEndsAt =
      data.trialEndsAt === null
        ? null
        : data.trialEndsAt
          ? new Date(data.trialEndsAt)
          : undefined;

    if (business.subscription) {
      await prisma.subscription.update({
        where: { businessId: business.id },
        data: {
          ...(data.plan !== undefined && { plan: data.plan }),
          ...(data.status !== undefined && { status: data.status }),
          ...(trialEndsAt !== undefined && { trialEndsAt }),
        },
      });
    } else {
      await prisma.subscription.create({
        data: {
          businessId: business.id,
          plan: data.plan || "trial",
          status: data.status || "active",
          trialEndsAt: trialEndsAt ?? new Date(Date.now() + 14 * 86400000),
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  }
}
