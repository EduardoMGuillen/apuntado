import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withVpsAuth } from "@/lib/internal-api";

export const POST = withVpsAuth(async (req: NextRequest) => {
  const body = await req.json();
  const { businessId, customerPhone, body: messageBody, fromClient } = body;

  if (!businessId || !customerPhone || !messageBody) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  await prisma.customer.upsert({
    where: {
      whatsappPhone_businessId: { whatsappPhone: customerPhone, businessId },
    },
    create: { businessId, whatsappPhone: customerPhone },
    update: {},
  });

  const message = await prisma.whatsappMessage.create({
    data: { businessId, customerPhone, body: messageBody, fromClient },
  });

  return NextResponse.json(message);
});
