import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withVpsAuth } from "@/lib/internal-api";
import { subMinutes } from "date-fns";

export const GET = withVpsAuth(async () => {
  const cutoff = subMinutes(new Date(), 30);

  const customers = await prisma.customer.findMany({
    where: {
      manualTakeover: true,
      takenOverAt: { lt: cutoff },
    },
    select: { businessId: true, whatsappPhone: true },
  });

  return NextResponse.json(
    customers.map((c) => ({
      businessId: c.businessId,
      customerPhone: c.whatsappPhone,
    }))
  );
});
