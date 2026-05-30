import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getWhatsappStatus } from "@/lib/vps";

export async function GET(
  _req: NextRequest,
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
    const vpsStatus = (await getWhatsappStatus(params.id)) as {
      connected?: boolean;
      hasQr?: boolean;
    };

    const connected = !!vpsStatus.connected;

    await prisma.whatsappSession.upsert({
      where: { businessId: params.id },
      create: { businessId: params.id, connected },
      update: { connected },
    });

    return NextResponse.json({
      connected,
      hasQr: !!vpsStatus.hasQr,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo consultar el VPS";

    const row = await prisma.whatsappSession.findUnique({
      where: { businessId: params.id },
    });

    return NextResponse.json({
      connected: row?.connected ?? false,
      hasQr: false,
      warning: message,
    });
  }
}
