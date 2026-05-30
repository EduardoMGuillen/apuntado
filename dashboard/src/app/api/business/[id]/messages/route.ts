import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { sendWhatsappMessage } from "@/lib/vps";
import { normalizeWhatsAppPhone } from "@/lib/phone";
import { reconcileCustomerPhone } from "@/lib/customer-phone";
import { resolveReplyJid } from "@/lib/reply-jid";

async function verifyOwner(businessId: string, userId: string) {
  return prisma.business.findFirst({
    where: { id: businessId, ownerId: userId },
  });
}

export async function GET(
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

  const rawPhone = req.nextUrl.searchParams.get("phone");
  if (!rawPhone) {
    return NextResponse.json({ error: "phone requerido" }, { status: 400 });
  }

  const phone = normalizeWhatsAppPhone(rawPhone);
  const phones = phone === rawPhone ? [phone] : [phone, rawPhone];

  const messages = await prisma.whatsappMessage.findMany({
    where: { businessId: params.id, customerPhone: { in: phones } },
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
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const business = await verifyOwner(params.id, session.user.id);
  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const { customerPhone: rawPhone, body } = await req.json();
  if (!rawPhone || !body) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const phone = await reconcileCustomerPhone(params.id, rawPhone);

  const customer = await prisma.customer.findUnique({
    where: {
      whatsappPhone_businessId: {
        whatsappPhone: phone,
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

  const replyJid = resolveReplyJid(phone, customer.whatsappReplyJid);

  try {
    await sendWhatsappMessage(params.id, phone, body, replyJid);
    const message = await prisma.whatsappMessage.create({
      data: {
        businessId: params.id,
        customerPhone: phone,
        body,
        fromClient: false,
      },
    });
    return NextResponse.json({
      ok: true,
      message: {
        body: message.body,
        fromClient: message.fromClient,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("[messages POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
