import { getAdminUsageOverview } from "@/lib/plan-usage";
import { PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";

export default async function AdminUsagePage() {
  const rows = await getAdminUsageOverview();
  const atRisk = rows.filter((r) => r.atRisk);
  const atLimit = rows.filter((r) => r.atLimit);
  const totalAi = rows.reduce((s, r) => s + r.aiCallsUsed, 0);
  const totalConv = rows.reduce((s, r) => s + r.conversationsUsed, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Uso mensual (IA y conversaciones)"
        description="Contadores por negocio en el mes calendario de su zona horaria. Sirve para detectar outliers antes de que consuman margen."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Negocios</p>
          <p className="text-2xl font-bold">{rows.length}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground">En riesgo (≥85%)</p>
          <p className="text-2xl font-bold text-amber-600">{atRisk.length}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground">En tope</p>
          <p className="text-2xl font-bold text-destructive">{atLimit.length}</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <p className="text-xs text-muted-foreground">IA total (mes)</p>
          <p className="text-2xl font-bold">{totalAi.toLocaleString("es-HN")}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {totalConv.toLocaleString("es-HN")} conversaciones
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Límites: prueba 100 / 100 · Básico 200 chats y 1 200 respuestas IA · Pro
        ilimitado. Alertas por email a SUPER_ADMIN_EMAILS al 85% y al 100%.
      </p>

      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Negocio</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">WA</th>
                <th className="px-4 py-3 font-medium">Conv.</th>
                <th className="px-4 py-3 font-medium">IA</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Dueño</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.businessId} className="border-t border-border/60">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.businessName}</div>
                    <div className="text-xs text-muted-foreground">{r.city}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">
                    {r.tier === "trial" ? "trial" : r.plan}
                  </td>
                  <td className="px-4 py-3">
                    {r.whatsappConnected ? "Sí" : "No"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {r.conversationsUsed}
                    {r.conversationsLimit != null ? ` / ${r.conversationsLimit}` : ""}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {r.aiCallsUsed}
                    {r.aiCallsLimit != null ? ` / ${r.aiCallsLimit}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    {r.atLimit ? (
                      <Badge variant="destructive">Tope</Badge>
                    ) : r.atRisk ? (
                      <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-200">
                        ≥85%
                      </Badge>
                    ) : (
                      <Badge variant="secondary">OK</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {r.ownerEmail}
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
