import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { isStripeConfigured, isSimulatedStripeId } from "@/lib/stripe-config";

const bodySchema = z.object({
  businessId: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Portal no disponible en modo demo (Stripe no configurado)" },
      { status: 400 }
    );
  }

  try {
    const { businessId } = bodySchema.parse(await req.json());

    const business = await prisma.business.findFirst({
      where: { id: businessId, ownerId: session.user.id },
      include: { subscription: true },
    });

    const customerId = business?.subscription?.stripeCustomerId;

    if (!customerId || isSimulatedStripeId(customerId)) {
      return NextResponse.json(
        { error: "No hay suscripción de Stripe asociada" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/app/${businessId}/suscripcion`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("[Stripe portal]", error);
    return NextResponse.json({ error: "Error al abrir portal" }, { status: 500 });
  }
}
