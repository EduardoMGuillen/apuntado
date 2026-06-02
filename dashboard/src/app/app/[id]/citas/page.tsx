import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getBusinessForSession } from "@/lib/business-access";
import { DashboardShell } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { formatPriceHNL } from "@/lib/bot-prompt";
import { subDays } from "date-fns";

const TZ = "America/Tegucigalpa";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
  completed: "Completada",
  no_show: "No asistió",
};

const CLIENT_TYPE_LABELS: Record<string, string> = {
  empresa: "Empresa",
  particular: "Particular",
};

function AppointmentCard({
  apt,
}: {
  apt: {
    id: string;
    scheduledAt: Date;
    status: string;
    customer: { name: string | null; whatsappPhone: string; clientType: string | null };
    service: { name: string; priceHNL: { toString(): string } };
    employee: { name: string } | null;
  };
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card p-4">
      <div>
        <p className="font-medium">
          {apt.customer.name || apt.customer.whatsappPhone}
        </p>
        <div className="mt-0.5 flex flex-wrap gap-1.5">
          {apt.customer.clientType && (
            <Badge variant="outline" className="text-xs font-normal">
              {CLIENT_TYPE_LABELS[apt.customer.clientType] ?? apt.customer.clientType}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {apt.service.name}
          {apt.employee ? ` · ${apt.employee.name}` : ""}
        </p>
        <p className="text-sm">
          {formatInTimeZone(apt.scheduledAt, TZ, "EEEE d MMM · h:mm a", {
            locale: es,
          })}
        </p>
      </div>
      <div className="text-right">
        <Badge variant="secondary" className="capitalize">
          {STATUS_LABELS[apt.status] || apt.status}
        </Badge>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatPriceHNL(apt.service.priceHNL.toString())}
        </p>
      </div>
    </div>
  );
}

export default async function CitasPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const business = await getBusinessForSession(session, params.id, {
    whatsappSession: true,
    subscription: true,
  });

  if (!business) redirect("/app");

  const rangeStart = subDays(new Date(), 1);

  const appointments = await prisma.appointment.findMany({
    where: {
      businessId: business.id,
      scheduledAt: { gte: rangeStart },
      status: { in: ["pending", "confirmed"] },
    },
    include: {
      customer: true,
      service: true,
      employee: true,
    },
    orderBy: { scheduledAt: "asc" },
    take: 100,
  });

  const now = new Date();
  const upcoming = appointments.filter((a) => a.scheduledAt >= now);
  const recentPast = appointments.filter((a) => a.scheduledAt < now);

  return (
    <DashboardShell business={business}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Citas</h1>
          <p className="text-sm text-muted-foreground">
            Citas agendadas por WhatsApp y el panel
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Próximas</h2>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground">No hay citas próximas</p>
          ) : (
            upcoming.map((apt) => <AppointmentCard key={apt.id} apt={apt} />)
          )}
        </section>

        {recentPast.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-muted-foreground">
              Recientes (últimas 24 h)
            </h2>
            {recentPast.map((apt) => (
              <AppointmentCard key={apt.id} apt={apt} />
            ))}
          </section>
        )}
      </div>
    </DashboardShell>
  );
}
