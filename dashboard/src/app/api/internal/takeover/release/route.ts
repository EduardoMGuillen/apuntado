import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withVpsAuth } from "@/lib/internal-api";

export const POST = withVpsAuth(async (req: NextRequest) => {
  const { businessId, customerPhone } = await req.json();

  if (!businessId || !customerPhone) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  await prisma.customer.update({
    where: {
      whatsappPhone_businessId: { whatsappPhone: customerPhone, businessId },
    },
    data: { manualTakeover: false, takenOverAt: null },
  });

  return NextResponse.json({ ok: true });
});
