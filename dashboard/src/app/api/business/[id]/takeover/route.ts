import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusinessApiAccess } from "@/lib/api-business-guard";
import { sendPushToBusinessOwner } from "@/lib/push";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireBusinessApiAccess(params.id);
  if (access.response) return access.response;

  const { customerPhone, manualTakeover } = await req.json();

  if (!customerPhone || typeof manualTakeover !== "boolean") {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const customer = await prisma.customer.upsert({
    where: {
      whatsappPhone_businessId: {
        whatsappPhone: customerPhone,
        businessId: params.id,
      },
    },
    create: {
      businessId: params.id,
      whatsappPhone: customerPhone,
      manualTakeover,
      takenOverAt: manualTakeover ? new Date() : null,
    },
    update: {
      manualTakeover,
      takenOverAt: manualTakeover ? new Date() : null,
    },
  });

  if (manualTakeover) {
    await sendPushToBusinessOwner(params.id, {
      title: "Intervención del agente",
      body: `Se tomó control manual de ${customer.name || customerPhone}.`,
      url: `/app/${params.id}/conversaciones`,
      tag: `takeover-${params.id}-${customerPhone}`,
    });
  }

  return NextResponse.json({ ok: true });
}
