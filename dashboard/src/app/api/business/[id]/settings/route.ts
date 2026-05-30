import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  minAdvanceMinutes: z.number().min(0).max(1440).optional(),
  maxAdvanceDays: z.number().min(1).max(90).optional(),
  reminder24h: z.boolean().optional(),
  botInstructions: z.string().max(2000).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const business = await prisma.business.findFirst({
    where: { id: params.id, ownerId: session.user.id },
    include: { settings: true },
  });

  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  try {
    const data = patchSchema.parse(await req.json());

    const settings = await prisma.businessSettings.upsert({
      where: { businessId: params.id },
      create: { businessId: params.id, ...data },
      update: data,
    });

    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
