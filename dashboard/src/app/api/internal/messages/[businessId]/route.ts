import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withVpsAuth } from "@/lib/internal-api";
import { buildPhoneVariants } from "@/lib/customer-context";
import { reconcileCustomerPhone } from "@/lib/customer-phone";

export const GET = withVpsAuth(async (req: NextRequest) => {
  const businessId = req.nextUrl.pathname.split("/").pop();
  const phone = req.nextUrl.searchParams.get("phone");
  const limit = Number(req.nextUrl.searchParams.get("limit") || "20");

  if (!businessId || !phone) {
    return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 });
  }

  const canonical = await reconcileCustomerPhone(businessId, phone);
  const variants = Array.from(
    new Set([...buildPhoneVariants(canonical), ...buildPhoneVariants(phone)])
  );

  const messages = await prisma.whatsappMessage.findMany({
    where: { businessId, customerPhone: { in: variants } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { body: true, fromClient: true, createdAt: true },
  });

  return NextResponse.json(
    messages.reverse().map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    }))
  );
});
