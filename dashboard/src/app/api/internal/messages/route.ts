import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withVpsAuth } from "@/lib/internal-api";
import { reconcileCustomerPhone } from "@/lib/customer-phone";
import { sendPushToBusinessOwner } from "@/lib/push";

export const POST = withVpsAuth(async (req: NextRequest) => {
  const body = await req.json();
  const { businessId, customerPhone, body: messageBody, fromClient, replyJid } =
    body;

  if (!businessId || !customerPhone || !messageBody) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const phone = await reconcileCustomerPhone(businessId, customerPhone);

  const jid =
    typeof replyJid === "string" && replyJid.includes("@") ? replyJid : null;

  await prisma.customer.upsert({
    where: {
      whatsappPhone_businessId: { whatsappPhone: phone, businessId },
    },
    create: {
      businessId,
      whatsappPhone: phone,
      ...(jid && { whatsappReplyJid: jid }),
    },
    update: jid ? { whatsappReplyJid: jid } : {},
  });

  const message = await prisma.whatsappMessage.create({
    data: { businessId, customerPhone: phone, body: messageBody, fromClient },
  });

  if (fromClient) {
    const preview = String(messageBody).slice(0, 120);
    await sendPushToBusinessOwner(businessId, {
      title: "Nuevo mensaje de WhatsApp",
      body: `${phone}: ${preview}`,
      url: `/app/${businessId}/conversaciones`,
      tag: `msg-${businessId}-${phone}`,
    });
  }

  return NextResponse.json(message);
});
