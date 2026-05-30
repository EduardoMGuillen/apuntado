import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const playbookSchema = z.object({
  when: z.string().min(3).max(200),
  action: z.string().min(5).max(400),
});

const patchSchema = z.object({
  botPlaybooks: z.array(playbookSchema).max(10).nullable().optional(),
  botInstructions: z.string().max(2000).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const business = await prisma.business.findFirst({
    where: { id: params.id, ownerId: session.user.id },
  });

  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);

    const updateData: Record<string, unknown> = {};

    if (data.botPlaybooks !== undefined) {
      updateData.botPlaybooks =
        data.botPlaybooks && data.botPlaybooks.length > 0
          ? JSON.stringify(data.botPlaybooks)
          : null;
    }
    if (data.botInstructions !== undefined) {
      updateData.botInstructions = data.botInstructions?.trim() || null;
    }

    const settings = await prisma.businessSettings.upsert({
      where: { businessId: params.id },
      create: { businessId: params.id, ...updateData },
      update: updateData,
    });

    return NextResponse.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
