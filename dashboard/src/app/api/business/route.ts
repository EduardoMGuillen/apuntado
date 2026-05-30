import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { startWhatsappSession } from "@/lib/vps";

const businessSchema = z.object({
  name: z.string().min(2),
  type: z.enum(["salon", "clinic", "mechanic", "dentist", "barbershop"]),
  phone: z.string().regex(/^\+504[39]\d{7}$/, "Formato: +504XXXXXXXX"),
  city: z.string().min(2),
  address: z.string().optional(),
  services: z
    .array(
      z.object({
        name: z.string().min(1),
        durationMin: z.number().min(15),
        priceHNL: z.number().min(0),
      })
    )
    .min(1),
  schedules: z
    .array(
      z.object({
        dayOfWeek: z.number().min(0).max(6),
        openTime: z.string(),
        closeTime: z.string(),
        isOpen: z.boolean(),
      })
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = businessSchema.parse(body);

    const business = await prisma.business.create({
      data: {
        name: data.name,
        type: data.type,
        phone: data.phone,
        city: data.city,
        address: data.address,
        ownerId: session.user.id,
        services: {
          create: data.services.map((s) => ({
            name: s.name,
            durationMin: s.durationMin,
            priceHNL: s.priceHNL,
          })),
        },
        schedules: {
          create: data.schedules,
        },
        settings: { create: {} },
        subscription: {
          create: {
            plan: "trial",
            status: "active",
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        },
        whatsappSession: { create: {} },
      },
    });

    try {
      await startWhatsappSession(business.id);
    } catch {
      /* VPS puede no estar disponible en desarrollo */
    }

    return NextResponse.json({ id: business.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Error al crear negocio" }, { status: 500 });
  }
}
