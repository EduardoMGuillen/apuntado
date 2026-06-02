import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getBusinessForSession } from "@/lib/business-access";
import { DashboardShell } from "@/components/dashboard/shell";
import { subDays } from "date-fns";
import { AppointmentsList } from "@/components/dashboard/appointments-list";

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

  return (
    <DashboardShell business={business}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Citas</h1>
          <p className="text-sm text-muted-foreground">
            Citas agendadas por WhatsApp y el panel
          </p>
        </div>

        <AppointmentsList
          businessId={business.id}
          initialAppointments={appointments.map((apt) => ({
            id: apt.id,
            scheduledAt: apt.scheduledAt.toISOString(),
            status: apt.status,
            customer: {
              name: apt.customer.name,
              whatsappPhone: apt.customer.whatsappPhone,
              clientType: apt.customer.clientType,
            },
            service: {
              name: apt.service.name,
              priceHNL: apt.service.priceHNL.toString(),
            },
            employee: apt.employee ? { name: apt.employee.name } : null,
          }))}
        />
      </div>
    </DashboardShell>
  );
}
