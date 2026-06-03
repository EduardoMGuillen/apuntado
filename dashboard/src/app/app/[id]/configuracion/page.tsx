import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getBusinessForSession } from "@/lib/business-access";
import { DashboardShell } from "@/components/dashboard/shell";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { GoogleCalendarCard } from "@/components/dashboard/google-calendar-card";
import { canUseGoogleCalendar } from "@/lib/google-calendar/config";
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
import { DEFAULT_TIMEZONE } from "@/lib/timezones";

export default async function ConfigPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { googleCalendar?: string };
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const business = await getBusinessForSession(session, params.id, {
    whatsappSession: true,
    subscription: true,
    settings: true,
    googleCalendar: true,
    employees: {
      where: { isActive: true, whatsappPhone: { not: null } },
      orderBy: { name: "asc" },
    },
  });

  if (!business) redirect("/app");

  const access = getSubscriptionAccess(business.subscription);

  const defaultSettings = {
    minAdvanceMinutes: 120,
    maxAdvanceDays: 30,
    reminder24h: true,
    timezone: DEFAULT_TIMEZONE,
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

        <GoogleCalendarCard
          businessId={business.id}
          featureAvailable={canUseGoogleCalendar(access)}
          initialConnected={!!business.googleCalendar}
          initialEmail={business.googleCalendar?.googleEmail ?? null}
          initialCalendarId={business.googleCalendar?.calendarId ?? null}
          initialCalendarSummary={
            business.googleCalendar?.calendarSummary ?? null
          }
          urlHint={searchParams?.googleCalendar ?? null}
        />

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
            timezone: business.settings?.timezone ?? defaultSettings.timezone,
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
          El tono del bot (formal, casual, etc.) está en{" "}
          <Link
            href={`/app/${business.id}/personalizacion`}
            className="font-medium text-primary underline"
          >
            Personalización
          </Link>
          , sección «Tono de conversación». Horarios y menú de bienvenida también ahí. Las reglas del bot están en{" "}
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
                  {access.trialEndsAt.toLocaleDateString("es", {
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
