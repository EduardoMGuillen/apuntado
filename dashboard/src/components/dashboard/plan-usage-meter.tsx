import Link from "next/link";
import type { MonthlyPlanUsage } from "@/lib/plan-usage";

function UsageBar({
  label,
  used,
  limit,
  atLimit,
  nearLimit,
}: {
  label: string;
  used: number;
  limit: number | null;
  atLimit: boolean;
  nearLimit: boolean;
}) {
  if (limit == null) return null;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-medium">
          {used.toLocaleString("es-HN")} / {limit.toLocaleString("es-HN")}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${atLimit ? "bg-destructive" : nearLimit ? "bg-amber-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface Props {
  usage: MonthlyPlanUsage;
  businessId: string;
  subscriptionReason?: string;
}

export function PlanUsageMeter({ usage, businessId, subscriptionReason }: Props) {
  if (!usage.applies) {
    return (
      <p className="text-sm text-muted-foreground">
        Plan Pro: conversaciones y respuestas con IA ilimitadas en{" "}
        <span className="capitalize">{usage.monthLabel}</span>.
      </p>
    );
  }

  const tierLabel =
    usage.tier === "trial" ? "Prueba gratuita" : "Plan Básico";
  const convAt = usage.conversations.limitReached;
  const convNear = usage.conversations.warn && !convAt;
  const aiAt = usage.aiCalls.limitReached;
  const aiNear = usage.aiCalls.warn && !aiAt;

  return (
    <div
      className={`rounded-lg border p-4 space-y-4 ${convAt || aiAt ? "border-destructive/40 bg-destructive/5" : convNear || aiNear ? "border-amber-500/40 bg-amber-500/10" : ""}`}
    >
      <p className="text-sm font-medium">
        Uso en <span className="capitalize">{usage.monthLabel}</span> ({tierLabel})
      </p>

      <UsageBar
        label="Conversaciones nuevas"
        used={usage.conversations.used}
        limit={usage.conversations.limit}
        atLimit={convAt}
        nearLimit={convNear}
      />

      <UsageBar
        label="Respuestas con IA"
        used={usage.aiCalls.used}
        limit={usage.aiCalls.limit}
        atLimit={aiAt}
        nearLimit={aiNear}
      />

      {usage.tier === "trial" && (
        <p className="text-xs text-muted-foreground">
          La prueba incluye hasta {usage.conversations.limit} conversaciones y{" "}
          {usage.aiCalls.limit} respuestas con IA por mes.
        </p>
      )}

      {convAt || aiAt ? (
        <p className="text-sm text-destructive">
          {usage.tier === "trial"
            ? "Límite de prueba alcanzado. Activá un plan para seguir con el bot automático."
            : "Límite del plan Básico alcanzado. Los chats ya abiertos pueden seguir; clientes nuevos o más respuestas IA requieren "}
          {usage.tier !== "trial" && (
            <>
              <Link
                href={`/app/${businessId}/suscripcion`}
                className="underline font-medium"
              >
                plan Pro
              </Link>
              .
            </>
          )}
        </p>
      ) : convNear || aiNear ? (
        <p className="text-sm text-muted-foreground">
          Cerca del límite mensual. Si tu negocio recibe mucho WhatsApp, el{" "}
          <Link
            href={`/app/${businessId}/suscripcion`}
            className="underline font-medium"
          >
            plan Pro
          </Link>{" "}
          evita cortes (chats y respuestas IA ilimitadas).
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Cada teléfono nuevo que escribe cuenta como una conversación. Cada respuesta
          del asistente con inteligencia artificial cuenta como una respuesta IA.
        </p>
      )}

      {subscriptionReason === "trial" && !convAt && !aiAt && (
        <p className="text-xs text-muted-foreground">
          Durante la prueba aplican límites para evitar abuso; al activar Básico o Pro
          cambian los topes.
        </p>
      )}
    </div>
  );
}
