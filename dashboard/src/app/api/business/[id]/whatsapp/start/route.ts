import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { startWhatsappSession, getWhatsappQr } from "@/lib/vps";

export const maxDuration = 30;

async function verifyOwner(businessId: string, userId: string) {
  return prisma.business.findFirst({
    where: { id: businessId, ownerId: userId },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const business = await verifyOwner(params.id, session.user.id);
  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const forceQr =
      typeof body === "object" &&
      body !== null &&
      (body as { forceQr?: boolean }).forceQr !== false;

    const data = await startWhatsappSession(params.id, { forceQr });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al iniciar sesión";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const business = await verifyOwner(params.id, session.user.id);
  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  try {
    const data = await getWhatsappQr(params.id);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "QR no disponible" }, { status: 404 });
  }
}
