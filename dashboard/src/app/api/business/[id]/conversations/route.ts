import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reconcileCustomerPhone } from "@/lib/customer-phone";
import { requireBusinessApiAccess } from "@/lib/api-business-guard";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const access = await requireBusinessApiAccess(params.id);
  if (access.response) return access.response;

  const business = access.business;

  const customers = await prisma.customer.findMany({
    where: { businessId: business.id },
    orderBy: { id: "desc" },
  });

  const customersWithLast = await Promise.all(
    customers.map(async (c) => {
      const phone = await reconcileCustomerPhone(business.id, c.whatsappPhone);

      const lastMsg = await prisma.whatsappMessage.findFirst({
        where: { businessId: business.id, customerPhone: phone },
        orderBy: { createdAt: "desc" },
      });

      return {
        whatsappPhone: phone,
        name: c.name,
        manualTakeover: c.manualTakeover,
        takenOverAt: c.takenOverAt?.toISOString() ?? null,
        lastMessage: lastMsg?.body,
        lastMessageAt: lastMsg?.createdAt.toISOString(),
      };
    })
  );

  customersWithLast.sort((a, b) => {
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  });

  return NextResponse.json(customersWithLast);
}
