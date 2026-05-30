import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { AlertBanner } from "@/components/dashboard/alert-banner";
import { getSubscriptionAccess } from "@/lib/subscription";

export default async function BusinessDashboard({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const business = await prisma.business.findFirst({
    where: { id: params.id, ownerId: session.user.id },
    include: {
      whatsappSession: true,
      subscription: true,
      services: { where: { isActive: true } },
    },
  });

  if (!business) redirect("/app");

  const access = getSubscriptionAccess(business.subscription);
  if (access.reason === "pending") {
    redirect(`/app/${business.id}/suscripcion?needs_card=1`);
  }

  const todayAppointments = await prisma.appointment.count({
    where: {
      businessId: business.id,
      scheduledAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
      status: { in: ["pending", "confirmed"] },
    },
  });

  const pendingMessages = await prisma.customer.count({
    where: { businessId: business.id, manualTakeover: true },
  });

  return (
    <DashboardShell business={business}>
      <div className="space-y-8">
        <PageHeader title={business.name} description={business.city ?? undefined} />

        {!access.active && (
          <AlertBanner
            variant="danger"
            href={`/app/${business.id}/suscripcion`}
            linkLabel="Activar plan →"
          >
            Tu bot está pausado porque la prueba o suscripción expiró.
          </AlertBanner>
        )}

        {access.reason === "trial" && access.trialEndsAt && (
          <AlertBanner
            variant="warning"
            href={`/app/${business.id}/suscripcion`}
            linkLabel="Ver planes"
          >
            Prueba gratis hasta{" "}
            {access.trialEndsAt.toLocaleDateString("es-HN", { dateStyle: "long" })}.
          </AlertBanner>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Citas hoy"
            value={todayAppointments}
            href={`/app/${business.id}/citas`}
            accent="primary"
          />
          <StatCard
            label="WhatsApp"
            value={
              business.whatsappSession?.connected ? "Conectado" : "Desconectado"
            }
            href={`/app/${business.id}/whatsapp`}
            accent="accent"
          />
          <StatCard
            label="Control manual"
            value={pendingMessages}
            href={`/app/${business.id}/conversaciones`}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
