import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/shell";
import { getSubscriptionAccess } from "@/lib/subscription";

export default async function BusinessDashboard({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(getAuthOptions());
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{business.name}</h1>
          <p className="text-muted-foreground">{business.city}</p>
        </div>

        {!access.active && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
            Tu bot está pausado porque la prueba o suscripción expiró.{" "}
            <Link
              href={`/app/${business.id}/suscripcion`}
              className="font-medium text-primary underline"
            >
              Activar plan →
            </Link>
          </div>
        )}

        {access.reason === "trial" && access.trialEndsAt && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
            Prueba gratis hasta{" "}
            {access.trialEndsAt.toLocaleDateString("es-HN", { dateStyle: "long" })}.{" "}
            <Link
              href={`/app/${business.id}/suscripcion`}
              className="font-medium text-primary underline"
            >
              Ver planes
            </Link>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Citas hoy"
            value={todayAppointments}
            href={`/app/${business.id}/citas`}
          />
          <StatCard
            label="WhatsApp"
            value={business.whatsappSession?.connected ? "Conectado" : "Desconectado"}
            href={`/app/${business.id}/whatsapp`}
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

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href: string;
}) {
  return (
    <a
      href={href}
      className="rounded-xl border bg-card p-6 shadow-sm transition-colors hover:bg-muted/50"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </a>
  );
}
