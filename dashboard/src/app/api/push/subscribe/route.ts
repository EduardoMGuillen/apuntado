import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const parsed = subscribeSchema.parse(await req.json());
    await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.endpoint },
      create: {
        userId: session.user.id,
        endpoint: parsed.endpoint,
        p256dh: parsed.keys.p256dh,
        auth: parsed.keys.auth,
        userAgent: req.headers.get("user-agent"),
      },
      update: {
        userId: session.user.id,
        p256dh: parsed.keys.p256dh,
        auth: parsed.keys.auth,
        userAgent: req.headers.get("user-agent"),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Suscripción inválida" }, { status: 400 });
    }
    return NextResponse.json({ error: "Error guardando suscripción" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { endpoint?: string };
    if (body.endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint: body.endpoint, userId: session.user.id },
      });
    } else {
      await prisma.pushSubscription.deleteMany({
        where: { userId: session.user.id },
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar suscripción" }, { status: 500 });
  }
}
