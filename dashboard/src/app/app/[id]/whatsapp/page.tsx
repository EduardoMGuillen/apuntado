import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WhatsappConnectClient } from "@/components/dashboard/whatsapp-connect";

export default async function WhatsappPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const business = await prisma.business.findFirst({
    where: { id: params.id, ownerId: session.user.id },
    include: { whatsappSession: true, subscription: true },
  });

  if (!business) redirect("/app");

  return <WhatsappConnectClient business={business} />;
}
