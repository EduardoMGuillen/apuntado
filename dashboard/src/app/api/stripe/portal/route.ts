import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

const bodySchema = z.object({
  businessId: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { businessId } = bodySchema.parse(await req.json());

    const business = await prisma.business.findFirst({
      where: { id: businessId, ownerId: session.user.id },
      include: { subscription: true },
    });

    if (!business?.subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No hay suscripción de Stripe asociada" },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: business.subscription.stripeCustomerId,
      return_url: `${appUrl}/app/${businessId}/suscripcion`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("[Stripe portal]", error);
    return NextResponse.json({ error: "Error al abrir portal" }, { status: 500 });
  }
}
