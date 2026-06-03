import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const [users, businesses, activeSubs, waConnected, recentBusinesses] =
    await Promise.all([
      prisma.user.count(),
      prisma.business.count(),
      prisma.subscription.count({ where: { status: "active" } }),
      prisma.whatsappSession.count({ where: { connected: true } }),
      prisma.business.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          owner: { select: { email: true, name: true } },
          subscription: true,
          whatsappSession: true,
        },
      }),
    ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Panel de soporte"
        description="Visión general de la plataforma Apuntado"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Usuarios" value={String(users)} href="/admin/users" />
        <StatCard label="Negocios" value={String(businesses)} href="/admin/businesses" />
        <StatCard label="Suscripciones activas" value={String(activeSubs)} href="/admin/businesses" />
        <StatCard label="WhatsApp conectados" value={String(waConnected)} href="/admin/businesses" />
        <StatCard label="Uso IA / mes" value="Ver" href="/admin/usage" />
      </div>

      <section className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-semibold">Negocios recientes</h2>
          <Link
            href="/admin/businesses"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full")}
          >
            Ver todos
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Negocio</th>
                <th className="pb-2 pr-4 font-medium">Dueño</th>
                <th className="pb-2 pr-4 font-medium">Plan</th>
                <th className="pb-2 pr-4 font-medium">WA</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {recentBusinesses.map((b) => (
                <tr key={b.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pr-4 font-medium">{b.name}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{b.owner.email}</td>
                  <td className="py-3 pr-4 capitalize">{b.subscription?.plan || "—"}</td>
                  <td className="py-3 pr-4">
                    {b.whatsappSession?.connected ? "✓" : "—"}
                  </td>
                  <td className="py-3">
                    <Link
                      href={`/app/${b.id}`}
                      className="text-primary hover:underline"
                    >
                      Abrir panel
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
