import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isSuperAdminSession } from "@/lib/business-access";

const patchSchema = z.object({
  plan: z.enum(["trial", "basic", "pro"]).optional(),
  status: z.enum(["active", "past_due", "canceled", "expired"]).optional(),
  trialEndsAt: z.string().nullable().optional(),
});

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
