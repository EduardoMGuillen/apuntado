import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withVpsAuth } from "@/lib/internal-api";
import { reconcileCustomerPhone } from "@/lib/customer-phone";
import { isManualTakeoverIdle } from "@/lib/manual-takeover-idle";

export const POST = withVpsAuth(async (req: NextRequest) => {
  const body = await req.json();
  const { businessId, customerPhone: rawPhone } = body;

  if (!businessId || !rawPhone) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const customerPhone = await reconcileCustomerPhone(businessId, rawPhone);
  const idle = await isManualTakeoverIdle(businessId, customerPhone, {
    excludeLatestMessage: true,
  });

  if (!idle) {
    return NextResponse.json({ released: false });
  }

  await prisma.customer.update({
    where: {
      whatsappPhone_businessId: { whatsappPhone: customerPhone, businessId },
    },
    data: { manualTakeover: false, takenOverAt: null },
  });

  return NextResponse.json({ released: true });
});
