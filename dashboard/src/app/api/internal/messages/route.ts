import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withVpsAuth } from "@/lib/internal-api";
import { reconcileCustomerPhone } from "@/lib/customer-phone";

export const POST = withVpsAuth(async (req: NextRequest) => {
  const body = await req.json();
  const { businessId, customerPhone, body: messageBody, fromClient } = body;

  if (!businessId || !customerPhone || !messageBody) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const phone = await reconcileCustomerPhone(businessId, customerPhone);

  await prisma.customer.upsert({
    where: {
      whatsappPhone_businessId: { whatsappPhone: phone, businessId },
    },
    create: { businessId, whatsappPhone: phone },
    update: {},
  });

  const message = await prisma.whatsappMessage.create({
    data: { businessId, customerPhone: phone, body: messageBody, fromClient },
  });

  return NextResponse.json(message);
});
