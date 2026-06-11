import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withVpsAuth } from "@/lib/internal-api";
import { reconcileCustomerPhone } from "@/lib/customer-phone";

export const POST = withVpsAuth(async (req: NextRequest) => {
  const body = await req.json();
  const { businessId, customerPhone, replyJid } = body;

  if (!businessId || !customerPhone) {
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
      manualTakeover: true,
      takenOverAt: new Date(),
      ...(jid && { whatsappReplyJid: jid }),
    },
    update: {
      manualTakeover: true,
      takenOverAt: new Date(),
      ...(jid && { whatsappReplyJid: jid }),
    },
  });

  return NextResponse.json({ ok: true });
});
