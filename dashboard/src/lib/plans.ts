export type PlanId = "basic" | "pro";

/** Días de prueba con tarjeta (Stripe); después se cobra el plan elegido. */
export const TRIAL_DAYS = 14;

/** Chats distintos con mensaje del cliente por mes calendario (zona del negocio). */
export const BASIC_MONTHLY_CONVERSATION_LIMIT = 200;

/** Referencia en lempiras (~24.5 L/USD) para marketing en Honduras. */
export const PLAN_PRICE_HNL: Record<PlanId, number> = {
  basic: 490,
  pro: 860,
};

export const PLAN_PRICE_USD: Record<PlanId, number> = {
  basic: 20,
  pro: 35,
};

export const PLANS: Record<
  PlanId,
  {
    name: string;
    priceLabel: string;
    description: string;
    features: string[];
  }
> = {
  basic: {
    name: "Básico",
    priceLabel: "$20/mes",
    description:
      "Un empleado · hasta 200 chats nuevos al mes · menos que media jornada de recepcionista.",
    features: [
      "Suscripción todo incluido (sin cargo Meta por mensaje)",
      "Bot de WhatsApp 24/7 en tu número",
      "Agenda automática y recordatorios 24h",
      "Hasta 200 conversaciones nuevas/mes",
      "Control manual cuando lo necesités",
    ],
  },
  pro: {
    name: "Pro",
    priceLabel: "$35/mes",
    description:
      "Varios empleados, chats ilimitados y más volumen — para cuando el Básico se queda corto.",
    features: [
      "Todo lo del plan Básico",
      "Múltiples empleados en alertas y equipo",
      "Conversaciones ilimitadas",
      "Ideal si superás 200 chats/mes",
      "Soporte prioritario",
    ],
  },
};

export function planHasConversationLimit(plan: string): boolean {
  return plan === "basic";
}

export function getStripePriceId(plan: PlanId): string {
  const envKey =
    plan === "basic" ? "STRIPE_PRICE_ID_BASIC" : "STRIPE_PRICE_ID_PRO";
  const priceId = process.env[envKey];
  if (!priceId) {
    throw new Error(`${envKey} no configurado en variables de entorno`);
  }
  return priceId;
}
