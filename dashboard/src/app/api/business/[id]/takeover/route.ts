import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const business = await prisma.business.findFirst({
    where: { id: params.id, ownerId: session.user.id },
  });

  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const { customerPhone, manualTakeover } = await req.json();

  if (!customerPhone || typeof manualTakeover !== "boolean") {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  await prisma.customer.upsert({
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

  return NextResponse.json({ ok: true });
}
