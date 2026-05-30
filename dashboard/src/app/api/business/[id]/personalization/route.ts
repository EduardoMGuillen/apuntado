import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { BUSINESS_TYPE_VALUES } from "@/lib/business-types";
import { BOOKING_MODE_VALUES } from "@/lib/booking-modes";
import { normalizeOfferings } from "@/lib/offerings";
import {
  WELCOME_MENU_MAX_OPTIONS,
  WELCOME_MENU_MIN_OPTIONS,
} from "@/lib/welcome-menu";
import { CONVERSATION_TONE_VALUES } from "@/lib/conversation-tones";

const HN_PHONE = /^\+504[39]\d{7}$/;

const offeringSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(120),
  durationMin: z.number().min(0).optional(),
  priceHNL: z.number().min(0).optional(),
});

const scheduleSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/),
  isOpen: z.boolean(),
});

const patchSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    type: z.enum(BUSINESS_TYPE_VALUES).optional(),
    phone: z.string().regex(HN_PHONE).optional(),
    city: z.string().min(2).max(80).optional(),
    address: z.string().max(200).nullable().optional(),
    bookingMode: z.enum(BOOKING_MODE_VALUES).optional(),
    offerings: z.array(offeringSchema).optional(),
    schedules: z.array(scheduleSchema).length(7).optional(),
    welcomeMenuGreeting: z.string().max(200).nullable().optional(),
    welcomeMenuOptions: z
      .array(z.string().min(2).max(80))
      .min(WELCOME_MENU_MIN_OPTIONS)
      .max(WELCOME_MENU_MAX_OPTIONS)
      .nullable()
      .optional(),
    conversationTone: z.enum(CONVERSATION_TONE_VALUES).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.bookingMode === "inquiries" || data.offerings === undefined) return;
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
    include: { settings: true, services: true },
  });

  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);
    const bookingMode =
      data.bookingMode ??
      (business.settings?.bookingMode as (typeof BOOKING_MODE_VALUES)[number]) ??
      "services";

    await prisma.$transaction(async (tx) => {
      if (
        data.name !== undefined ||
        data.type !== undefined ||
        data.phone !== undefined ||
        data.city !== undefined ||
        data.address !== undefined
      ) {
        await tx.business.update({
          where: { id: params.id },
          data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.type !== undefined && { type: data.type }),
            ...(data.phone !== undefined && { phone: data.phone }),
            ...(data.city !== undefined && { city: data.city }),
            ...(data.address !== undefined && {
              address: data.address?.trim() || null,
            }),
          },
        });
      }

      const settingsUpdate: Record<string, unknown> = {};
      if (data.bookingMode !== undefined) {
        settingsUpdate.bookingMode = data.bookingMode;
      }
      if (data.welcomeMenuGreeting !== undefined) {
        settingsUpdate.welcomeMenuGreeting =
          data.welcomeMenuGreeting?.trim() || null;
      }
      if (data.welcomeMenuOptions !== undefined) {
        settingsUpdate.welcomeMenuOptions =
          data.welcomeMenuOptions && data.welcomeMenuOptions.length > 0
            ? JSON.stringify(data.welcomeMenuOptions)
            : null;
      }
      if (data.conversationTone !== undefined) {
        settingsUpdate.conversationTone = data.conversationTone;
      }

      if (Object.keys(settingsUpdate).length > 0) {
        await tx.businessSettings.upsert({
          where: { businessId: params.id },
          create: { businessId: params.id, ...settingsUpdate },
          update: settingsUpdate,
        });
      }

      if (data.schedules) {
        for (const row of data.schedules) {
          await tx.schedule.upsert({
            where: {
              businessId_dayOfWeek: {
                businessId: params.id,
                dayOfWeek: row.dayOfWeek,
              },
            },
            create: { businessId: params.id, ...row },
            update: {
              openTime: row.openTime,
              closeTime: row.closeTime,
              isOpen: row.isOpen,
            },
          });
        }
      }

      if (data.offerings !== undefined || data.bookingMode === "inquiries") {
        const normalized = normalizeOfferings(
          bookingMode,
          data.offerings ?? []
        );
        const keptIds = new Set<string>();

        if (bookingMode === "inquiries") {
          const inquiry = normalized[0];
          const existing =
            business.services.find((s) => s.isActive) ?? business.services[0];
          if (existing) {
            await tx.service.update({
              where: { id: existing.id },
              data: {
                name: inquiry.name,
                durationMin: inquiry.durationMin,
                priceHNL: inquiry.priceHNL,
                isActive: true,
              },
            });
            keptIds.add(existing.id);
          } else {
            const created = await tx.service.create({
              data: {
                businessId: params.id,
                name: inquiry.name,
                durationMin: inquiry.durationMin,
                priceHNL: inquiry.priceHNL,
              },
            });
            keptIds.add(created.id);
          }

          await tx.service.updateMany({
            where: {
              businessId: params.id,
              id: { notIn: Array.from(keptIds) },
            },
            data: { isActive: false },
          });
        } else if (data.offerings !== undefined) {
          for (let i = 0; i < data.offerings.length; i++) {
            const input = data.offerings[i];
            const norm = normalized[i];
            if (input.id) {
              await tx.service.updateMany({
                where: { id: input.id, businessId: params.id },
                data: {
                  name: norm.name,
                  durationMin: norm.durationMin,
                  priceHNL: norm.priceHNL,
                  isActive: true,
                },
              });
              keptIds.add(input.id);
            } else {
              const created = await tx.service.create({
                data: {
                  businessId: params.id,
                  name: norm.name,
                  durationMin: norm.durationMin,
                  priceHNL: norm.priceHNL,
                },
              });
              keptIds.add(created.id);
            }
          }

          await tx.service.updateMany({
            where: {
              businessId: params.id,
              id: { notIn: Array.from(keptIds) },
            },
            data: { isActive: false },
          });
        }
      }
    });

    const updated = await prisma.business.findUnique({
      where: { id: params.id },
      include: {
        settings: true,
        services: { where: { isActive: true }, orderBy: { name: "asc" } },
        schedules: { orderBy: { dayOfWeek: "asc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }
    console.error("personalization PATCH", error);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
