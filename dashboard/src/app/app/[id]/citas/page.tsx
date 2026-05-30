import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { formatPriceHNL } from "@/lib/bot-prompt";

const TZ = "America/Tegucigalpa";

export default async function CitasPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user?.id) redirect("/login");

  const business = await prisma.business.findFirst({
    where: { id: params.id, ownerId: session.user.id },
    include: { whatsappSession: true, subscription: true },
  });

  if (!business) redirect("/app");

  const appointments = await prisma.appointment.findMany({
    where: {
      businessId: business.id,
      scheduledAt: { gte: new Date() },
      status: { in: ["pending", "confirmed"] },
    },
    include: {
      customer: true,
      service: true,
      employee: true,
    },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });

  const STATUS_LABELS: Record<string, string> = {
    pending: "Pendiente",
    confirmed: "Confirmada",
    cancelled: "Cancelada",
    completed: "Completada",
    no_show: "No asistió",
  };

  return (
    <DashboardShell business={business}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Citas</h1>

        {appointments.length === 0 ? (
          <p className="text-muted-foreground">No hay citas próximas</p>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between rounded-xl border bg-card p-4"
              >
                <div>
                  <p className="font-medium">
                    {apt.customer.name || apt.customer.whatsappPhone}
                  </p>
                  <p className="text-sm text-muted-foreground">
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
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
