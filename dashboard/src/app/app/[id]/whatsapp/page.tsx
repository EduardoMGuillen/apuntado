import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { WhatsappConnectClient } from "@/components/dashboard/whatsapp-connect";
import { getSubscriptionAccess } from "@/lib/subscription";
import { startWhatsappSession } from "@/lib/vps";

export default async function WhatsappPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { trial?: string };
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const business = await prisma.business.findFirst({
    where: { id: params.id, ownerId: session.user.id },
    include: { whatsappSession: true, subscription: true },
  });

  if (!business) redirect("/app");

  const access = getSubscriptionAccess(business.subscription);
  if (!access.active) {
    redirect(`/app/${params.id}/suscripcion?needs_card=1`);
  }

  if (searchParams.trial === "ok") {
    try {
      await startWhatsappSession(business.id);
    } catch {
      /* VPS puede no estar disponible en desarrollo */
    }
  }

  return <WhatsappConnectClient business={business} />;
}
