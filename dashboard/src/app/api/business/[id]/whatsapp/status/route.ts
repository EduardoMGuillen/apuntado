import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWhatsappStatus } from "@/lib/vps";
import { requireBusinessApiAccess } from "@/lib/api-business-guard";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireBusinessApiAccess(params.id);
  if (access.response) return access.response;

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
