import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
  const session = await getSession();
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
            plan: "basic",
            status: "pending",
          },
        },
        whatsappSession: { create: {} },
      },
    });

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
