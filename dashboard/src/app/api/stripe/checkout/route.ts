import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { z } from "zod";
import { verifyBusinessAccess } from "@/lib/business-access";
import { changeBusinessPlan, PlanChangeError } from "@/lib/change-plan";

const bodySchema = z.object({
  businessId: z.string(),
  plan: z.enum(["basic", "pro"]),
  trial: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = bodySchema.parse(await req.json());

    const business = await verifyBusinessAccess(
      body.businessId,
      session.user.id,
      session.user.role
    );

    if (!business) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const result = await changeBusinessPlan(business.id, body.plan, {
      withTrial: body.trial,
      appUrl,
    });

    return NextResponse.json({
      url: result.url,
      simulated: result.mode === "simulated",
      planChanged: result.mode === "stripe_updated",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    if (error instanceof PlanChangeError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error("[Stripe checkout]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al cambiar plan" },
      { status: 500 }
    );
  }
}
