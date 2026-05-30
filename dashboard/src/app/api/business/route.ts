import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { BUSINESS_TYPE_VALUES } from "@/lib/business-types";
import { BOOKING_MODE_VALUES } from "@/lib/booking-modes";
import { normalizeOfferings } from "@/lib/offerings";
import { z } from "zod";

const offeringSchema = z.object({
  name: z.string().min(1),
  durationMin: z.number().min(0).optional(),
  priceHNL: z.number().min(0).optional(),
});

const businessSchema = z
  .object({
    name: z.string().min(2),
    type: z.enum(BUSINESS_TYPE_VALUES),
    phone: z.string().regex(/^\+504[39]\d{7}$/, "Formato: +504XXXXXXXX"),
    city: z.string().min(2),
    address: z.string().optional(),
    bookingMode: z.enum(BOOKING_MODE_VALUES),
    websiteUrl: z.string().max(500).optional(),
    offerings: z.array(offeringSchema),
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
  })
  .superRefine((data, ctx) => {
    if (data.bookingMode === "inquiries") return;

    if (data.offerings.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          data.bookingMode === "menu"
            ? "Agregá al menos un ítem al menú"
            : "Agregá al menos un servicio",
        path: ["offerings"],
      });
    }
  });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = businessSchema.parse(body);
    const services = normalizeOfferings(data.bookingMode, data.offerings);

    const business = await prisma.business.create({
      data: {
        name: data.name,
        type: data.type,
        phone: data.phone,
        city: data.city,
        address: data.address,
        ownerId: session.user.id,
        services: {
          create: services.map((s) => ({
            name: s.name,
            durationMin: s.durationMin,
            priceHNL: s.priceHNL,
          })),
        },
        schedules: {
          create: data.schedules,
        },
        settings: {
          create: {
            bookingMode: data.bookingMode,
            websiteUrl: data.websiteUrl?.trim() || null,
          },
        },
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
