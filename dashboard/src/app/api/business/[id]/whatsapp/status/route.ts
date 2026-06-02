import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWhatsappStatus } from "@/lib/vps";
import { requireBusinessApiAccess } from "@/lib/api-business-guard";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireBusinessApiAccess(params.id);
  if (access.response) return access.response;

  const ensure =
    req.nextUrl.searchParams.get("ensure") === "true" ||
    req.nextUrl.searchParams.get("ensure") === "1";

  try {
    const vpsStatus = (await getWhatsappStatus(params.id, { ensure })) as {
      connected?: boolean;
      hasQr?: boolean;
      hasPersistedAuth?: boolean;
      sessionActive?: boolean;
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
      hasPersistedAuth: !!vpsStatus.hasPersistedAuth,
      sessionActive: !!vpsStatus.sessionActive,
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
      hasPersistedAuth: false,
      sessionActive: false,
      warning: message,
    });
  }
}
