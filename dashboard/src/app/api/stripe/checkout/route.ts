import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { getStripePriceId, type PlanId } from "@/lib/plans";

const bodySchema = z.object({
  businessId: z.string(),
  plan: z.enum(["basic", "pro"]),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = bodySchema.parse(await req.json());
    const plan = body.plan as PlanId;

    const business = await prisma.business.findFirst({
      where: { id: body.businessId, ownerId: session.user.id },
      include: {
        subscription: true,
        owner: { select: { email: true, name: true } },
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const priceId = getStripePriceId(plan);

    let customerId = business.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: business.owner.email,
        name: business.name,
        metadata: {
          businessId: business.id,
          userId: session.user.id,
        },
      });
      customerId = customer.id;
      await prisma.subscription.update({
        where: { businessId: business.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/app/${business.id}/suscripcion?success=1`,
      cancel_url: `${appUrl}/app/${business.id}/suscripcion?canceled=1`,
      metadata: {
        businessId: business.id,
        plan,
      },
      subscription_data: {
        metadata: {
          businessId: business.id,
          plan,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    console.error("[Stripe checkout]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear checkout" },
      { status: 500 }
    );
  }
}
