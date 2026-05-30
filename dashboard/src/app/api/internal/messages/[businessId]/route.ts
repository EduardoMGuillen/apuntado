import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withVpsAuth } from "@/lib/internal-api";

export const GET = withVpsAuth(async (req: NextRequest) => {
  const businessId = req.nextUrl.pathname.split("/").pop();
  const phone = req.nextUrl.searchParams.get("phone");
  const limit = Number(req.nextUrl.searchParams.get("limit") || "20");

  if (!businessId || !phone) {
    return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 });
  }

  const messages = await prisma.whatsappMessage.findMany({
    where: { businessId, customerPhone: phone },
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
