import { BASIC_MONTHLY_CONVERSATION_LIMIT } from "@/lib/plans";
import Link from "next/link";

interface Props {
  used: number;
  limit: number | null;
  monthLabel: string;
  applies: boolean;
  plan: string;
  businessId: string;
}

export function ConversationUsageMeter({
  used,
  limit,
  monthLabel,
  applies,
  plan,
  businessId,
}: Props) {
  if (!applies || limit == null) {
    if (plan === "pro") {
      return (
        <p className="text-sm text-muted-foreground">
          Plan Pro: conversaciones ilimitadas en {monthLabel}.
        </p>
      );
    }
    return null;
  }

  const pct = Math.min(100, Math.round((used / limit) * 100));
  const nearLimit = used >= limit * 0.85;
  const atLimit = used >= limit;

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${atLimit ? "border-destructive/40 bg-destructive/5" : nearLimit ? "border-amber-500/40 bg-amber-500/10" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>
          Conversaciones nuevas en <strong className="capitalize">{monthLabel}</strong>
        </span>
        <span className="font-medium">
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${atLimit ? "bg-destructive" : nearLimit ? "bg-amber-500" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {atLimit ? (
        <p className="text-sm text-destructive">
          Límite del plan Básico alcanzado. Chats que ya escribieron este mes siguen
          atendidos; clientes nuevos reciben aviso hasta que subas a{" "}
          <Link href={`/app/${businessId}/suscripcion`} className="underline font-medium">
            Pro
          </Link>
          .
        </p>
      ) : nearLimit ? (
        <p className="text-sm text-muted-foreground">
          Cerca del tope ({BASIC_MONTHLY_CONVERSATION_LIMIT}/mes). Considerá el plan Pro
          para chats ilimitados y varios empleados.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Cada teléfono distinto que te escribe por primera vez en el mes cuenta como una
          conversación.
        </p>
      )}
    </div>
  );
}
