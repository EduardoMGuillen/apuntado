import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isProPlan } from "@/lib/team-notify";

const HN_PHONE = /^\+504[39]\d{7}$/;

const playbookSchema = z.object({
  when: z.string().min(3).max(200),
  action: z.string().min(5).max(400),
});

const teamMemberSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
  whatsappPhone: z.string().regex(HN_PHONE, "Formato: +504XXXXXXXX"),
});

const patchSchema = z.object({
  minAdvanceMinutes: z.number().min(0).max(1440).optional(),
  maxAdvanceDays: z.number().min(1).max(90).optional(),
  reminder24h: z.boolean().optional(),
  websiteUrl: z.string().max(500).nullable().optional(),
  notifyPhone: z
    .union([z.string().regex(HN_PHONE, "Formato: +504XXXXXXXX"), z.literal(""), z.null()])
    .optional(),
  botPlaybooks: z.array(playbookSchema).max(10).nullable().optional(),
  botInstructions: z.string().max(2000).nullable().optional(),
  teamMembers: z.array(teamMemberSchema).max(10).optional(),
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
    include: { settings: true, subscription: true, employees: true },
  });

  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);

    if (data.teamMembers !== undefined && !isProPlan(business.subscription)) {
      return NextResponse.json(
        { error: "El equipo de alertas requiere plan Pro" },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = { ...data };
    delete updateData.botPlaybooks;
    delete updateData.websiteUrl;
    delete updateData.notifyPhone;
    delete updateData.teamMembers;

    if (data.websiteUrl !== undefined) {
      updateData.websiteUrl = data.websiteUrl?.trim() || null;
    }
    if (data.notifyPhone !== undefined) {
      updateData.notifyPhone = data.notifyPhone?.trim() || null;
    }
    if (data.botPlaybooks !== undefined) {
      updateData.botPlaybooks =
        data.botPlaybooks && data.botPlaybooks.length > 0
          ? JSON.stringify(data.botPlaybooks)
          : null;
    }

    const settings = await prisma.$transaction(async (tx) => {
      const savedSettings = await tx.businessSettings.upsert({
        where: { businessId: params.id },
        create: { businessId: params.id, ...updateData },
        update: updateData,
      });

      if (data.teamMembers !== undefined) {
        const keptIds = new Set<string>();

        for (const member of data.teamMembers) {
          if (member.id) {
            await tx.employee.updateMany({
              where: { id: member.id, businessId: params.id },
              data: {
                name: member.name,
                whatsappPhone: member.whatsappPhone,
                isActive: true,
              },
            });
            keptIds.add(member.id);
          } else {
            const created = await tx.employee.create({
              data: {
                businessId: params.id,
                name: member.name,
                whatsappPhone: member.whatsappPhone,
                isActive: true,
              },
            });
            keptIds.add(created.id);
          }
        }

        await tx.employee.updateMany({
          where: {
            businessId: params.id,
            whatsappPhone: { not: null },
            id: { notIn: Array.from(keptIds) },
          },
          data: { isActive: false },
        });
      }

      return savedSettings;
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
