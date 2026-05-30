import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/shell";
import { SubscriptionPlans } from "@/components/dashboard/subscription-plans";
import { getSubscriptionAccess } from "@/lib/subscription";
import { isStripeConfigured } from "@/lib/stripe-config";
import { Badge } from "@/components/ui/badge";

export default async function SuscripcionPage({
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

  const access = getSubscriptionAccess(business.subscription);
  const stripeSimulate = !isStripeConfigured();

  return (
    <DashboardShell business={business}>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold">Suscripción</h1>
          <p className="text-muted-foreground">
            {stripeSimulate
              ? "Modo demo: un solo plan activo (Básico o Pro)."
              : "Un plan por negocio. Podés cambiar entre Básico y Pro cuando quieras."}
          </p>
          <div className="mt-2 flex gap-2">
            <Badge variant="secondary" className="capitalize">
              {access.plan}
            </Badge>
            <Badge
              variant={access.active ? "default" : "destructive"}
              className="capitalize"
            >
              {access.active ? "Activo" : access.status}
            </Badge>
          </div>
        </div>

        <Suspense fallback={<p>Cargando planes...</p>}>
          <SubscriptionPlans
            businessId={business.id}
            access={{
              active: access.active,
              reason: access.reason,
              plan: access.plan,
              status: access.status,
              trialEndsAt: access.trialEndsAt?.toISOString() ?? null,
              currentPeriodEnd: access.currentPeriodEnd?.toISOString() ?? null,
            }}
            hasStripeCustomer={!!business.subscription?.stripeCustomerId}
            stripeSimulate={stripeSimulate}
          />
        </Suspense>
      </div>
    </DashboardShell>
  );
}
