export type PlanId = "basic" | "pro";

/** Días de prueba con tarjeta (Stripe); después se cobra el plan elegido. */
export const TRIAL_DAYS = 14;

/** Chats distintos con mensaje del cliente por mes calendario (zona del negocio). */
export const TRIAL_MONTHLY_CONVERSATION_LIMIT = 100;
export const TRIAL_MONTHLY_AI_CALL_LIMIT = 100;
export const BASIC_MONTHLY_CONVERSATION_LIMIT = 200;
/** Respuestas con llamada a Claude Haiku (plan Básico). */
export const BASIC_MONTHLY_AI_CALL_LIMIT = 1200;
/** Aviso en panel y email interno al super admin. */
export const USAGE_WARN_RATIO = 0.85;

export type UsageTier = "trial" | "basic" | "pro";

export function resolveUsageTier(
  plan: string,
  reason?: string
): UsageTier {
  if (reason === "trial") return "trial";
  if (plan === "pro") return "pro";
  return "basic";
}

export function getUsageLimitsForTier(tier: UsageTier): {
  conversations: number | null;
  aiCalls: number | null;
} {
  switch (tier) {
    case "trial":
      return {
        conversations: TRIAL_MONTHLY_CONVERSATION_LIMIT,
        aiCalls: TRIAL_MONTHLY_AI_CALL_LIMIT,
      };
    case "basic":
      return {
        conversations: BASIC_MONTHLY_CONVERSATION_LIMIT,
        aiCalls: BASIC_MONTHLY_AI_CALL_LIMIT,
      };
    case "pro":
      return { conversations: null, aiCalls: null };
  }
}

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
      "Un empleado · hasta 200 chats y 1 200 respuestas IA/mes · ideal para volumen moderado.",
    features: [
      "Suscripción todo incluido (sin cargo Meta por mensaje)",
      "Bot de WhatsApp 24/7 en tu número",
      "Agenda automática y recordatorios 24h",
      "Hasta 200 conversaciones nuevas/mes",
      "Hasta 1 200 respuestas con IA/mes",
      "Control manual cuando lo necesités",
      "Google Calendar: sincronizar citas y bloquear horarios ocupados",
    ],
  },
  pro: {
    name: "Pro",
    priceLabel: "$35/mes",
    description:
      "Para negocios con mucho WhatsApp: chats y respuestas IA ilimitadas, varios empleados.",
    features: [
      "Todo lo del plan Básico",
      "Conversaciones nuevas ilimitadas",
      "Respuestas con IA ilimitadas",
      "Múltiples empleados en alertas y equipo",
      "Recomendado si superás 200 chats o 1 200 respuestas IA/mes",
      "Soporte prioritario",
      "Google Calendar (un calendario por negocio; compartilo con tu equipo en Google)",
    ],
  },
};

export function planHasUsageLimits(tier: UsageTier): boolean {
  return tier === "basic" || tier === "trial";
}

/** @deprecated Use planHasUsageLimits(resolveUsageTier(...)) */
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
