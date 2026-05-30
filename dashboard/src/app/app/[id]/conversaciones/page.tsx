import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ConversationsClient } from "@/components/dashboard/conversations";

export default async function ConversationsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const business = await prisma.business.findFirst({
    where: { id: params.id, ownerId: session.user.id },
    include: { whatsappSession: true, subscription: true },
  });

  if (!business) redirect("/app");

  const customers = await prisma.customer.findMany({
    where: { businessId: business.id },
    orderBy: { id: "desc" },
  });

  const customersWithLast = await Promise.all(
    customers.map(async (c) => {
      const last = await prisma.whatsappMessage.findFirst({
        where: { businessId: business.id, customerPhone: c.whatsappPhone },
        orderBy: { createdAt: "desc" },
      });
      return {
        whatsappPhone: c.whatsappPhone,
        name: c.name,
        manualTakeover: c.manualTakeover,
        takenOverAt: c.takenOverAt?.toISOString() ?? null,
        lastMessage: last?.body,
        lastMessageAt: last?.createdAt.toISOString(),
      };
    })
  );

  customersWithLast.sort((a, b) => {
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  });

  return (
    <ConversationsClient business={business} customers={customersWithLast} />
  );
}
