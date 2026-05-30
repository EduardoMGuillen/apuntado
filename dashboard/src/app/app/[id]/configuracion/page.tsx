import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/shell";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isProPlan } from "@/lib/team-notify";
import { getSubscriptionAccess } from "@/lib/subscription";

export default async function ConfigPage({
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
      settings: true,
      employees: {
        where: { isActive: true, whatsappPhone: { not: null } },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!business) redirect("/app");

  const access = getSubscriptionAccess(business.subscription);

  const defaultSettings = {
    minAdvanceMinutes: 120,
    maxAdvanceDays: 30,
    reminder24h: true,
    websiteUrl: null as string | null,
    notifyPhone: null as string | null,
    teamMembers: [] as { id?: string; name: string; whatsappPhone: string }[],
  };

  return (
    <DashboardShell business={business}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Configuración</h1>

        {!access.active && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
            Tu suscripción no está activa.{" "}
            <Link
              href={`/app/${business.id}/suscripcion`}
              className="font-medium text-primary underline"
            >
              Activar plan
            </Link>
          </div>
        )}

        <SettingsForm
          businessId={business.id}
          isPro={isProPlan(business.subscription)}
          initial={{
            minAdvanceMinutes:
              business.settings?.minAdvanceMinutes ?? defaultSettings.minAdvanceMinutes,
            maxAdvanceDays:
              business.settings?.maxAdvanceDays ?? defaultSettings.maxAdvanceDays,
            reminder24h:
              business.settings?.reminder24h ?? defaultSettings.reminder24h,
            websiteUrl: business.settings?.websiteUrl ?? null,
            notifyPhone: business.settings?.notifyPhone ?? null,
            teamMembers: business.employees.map((employee) => ({
              id: employee.id,
              name: employee.name,
              whatsappPhone: employee.whatsappPhone || "",
            })),
          }}
        />

        <p className="text-sm text-muted-foreground">
          Para editar horarios, modo del bot o menú de bienvenida, andá a{" "}
          <Link
            href={`/app/${business.id}/personalizacion`}
            className="font-medium text-primary underline"
          >
            Personalización
          </Link>
          . Las reglas del bot están en{" "}
          <Link
            href={`/app/${business.id}/reglas`}
            className="font-medium text-primary underline"
          >
            Reglas
          </Link>
          .
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Negocio</CardTitle>
              <CardDescription>Información general</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Nombre:</span>{" "}
                {business.name}
              </p>
              <p>
                <span className="text-muted-foreground">Teléfono:</span>{" "}
                {business.phone}
              </p>
              <p>
                <span className="text-muted-foreground">Ciudad:</span>{" "}
                {business.city}
              </p>
              {business.address && (
                <p>
                  <span className="text-muted-foreground">Dirección:</span>{" "}
                  {business.address}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suscripción</CardTitle>
              <CardDescription>Plan y facturación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-2">
                <Badge variant="secondary" className="capitalize">
                  {access.plan}
                </Badge>
                <Badge variant={access.active ? "default" : "destructive"}>
                  {access.active ? "Activo" : access.status}
                </Badge>
              </div>
              {access.trialEndsAt && access.reason === "trial" && (
                <p>
                  Prueba hasta:{" "}
                  {access.trialEndsAt.toLocaleDateString("es-HN", {
                    dateStyle: "long",
                  })}
                </p>
              )}
              <Link
                href={`/app/${business.id}/suscripcion`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Gestionar suscripción
              </Link>
            </CardContent>
          </Card>

        </div>
      </div>
    </DashboardShell>
  );
}
