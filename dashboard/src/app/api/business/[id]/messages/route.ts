import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendWhatsappMessage } from "@/lib/vps";

async function verifyOwner(businessId: string, userId: string) {
  return prisma.business.findFirst({
    where: { id: businessId, ownerId: userId },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const business = await verifyOwner(params.id, session.user.id);
  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) {
    return NextResponse.json({ error: "phone requerido" }, { status: 400 });
  }

  const messages = await prisma.whatsappMessage.findMany({
    where: { businessId: params.id, customerPhone: phone },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: { body: true, fromClient: true, createdAt: true },
  });

  return NextResponse.json(
    messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const business = await verifyOwner(params.id, session.user.id);
  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const { customerPhone, body } = await req.json();
  if (!customerPhone || !body) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({
    where: {
      whatsappPhone_businessId: {
        whatsappPhone: customerPhone,
        businessId: params.id,
      },
    },
  });

  if (!customer?.manualTakeover) {
    return NextResponse.json(
      { error: "Debes tomar control manual primero" },
      { status: 400 }
    );
  }

  try {
    await sendWhatsappMessage(params.id, customerPhone, body);
    await prisma.whatsappMessage.create({
      data: {
        businessId: params.id,
        customerPhone,
        body,
        fromClient: false,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
