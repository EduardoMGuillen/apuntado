import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { businessId: string } }
) {
  const secret = req.headers.get("x-vps-secret");
  if (secret !== process.env.VPS_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { connected } = await req.json();

  await prisma.whatsappSession.upsert({
    where: { businessId: params.businessId },
    create: { businessId: params.businessId, connected },
    update: { connected },
  });

  return NextResponse.json({ ok: true });
}
