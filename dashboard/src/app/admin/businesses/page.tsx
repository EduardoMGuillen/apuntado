import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { AdminSubscriptionEditor } from "@/components/admin/subscription-editor";

export default async function AdminBusinessesPage() {
  const businesses = await prisma.business.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { email: true, name: true } },
      subscription: true,
      whatsappSession: true,
      _count: { select: { appointments: true, customers: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Negocios"
        description={`${businesses.length} negocios en la plataforma`}
      />

      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Negocio</th>
                <th className="px-4 py-3 font-medium">Ciudad</th>
                <th className="px-4 py-3 font-medium">Dueño</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">WA</th>
                <th className="px-4 py-3 font-medium">Citas</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => (
                <tr key={b.id} className="border-t border-border/60 align-top">
                  <td className="px-4 py-3 font-medium">{b.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{b.city}</td>
                  <td className="px-4 py-3">
                    <div>{b.owner.name}</div>
                    <div className="text-xs text-muted-foreground">{b.owner.email}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {b.subscription?.plan || "—"}
                    <div className="text-xs text-muted-foreground">
                      {b.subscription?.status}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {b.whatsappSession?.connected ? "Conectado" : "No"}
                  </td>
                  <td className="px-4 py-3">{b._count.appointments}</td>
                  <td className="px-4 py-3 space-y-2">
                    <div>
                      <Link
                        href={`/app/${b.id}`}
                        className="text-primary hover:underline"
                      >
                        Abrir panel
                      </Link>
                    </div>
                    <AdminSubscriptionEditor
                      businessId={b.id}
                      businessName={b.name}
                      subscription={
                        b.subscription
                          ? {
                              plan: b.subscription.plan,
                              status: b.subscription.status,
                              trialEndsAt: b.subscription.trialEndsAt?.toISOString() ?? null,
                            }
                          : null
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
