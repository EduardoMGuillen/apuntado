export type PlanId = "basic" | "pro";

/** Días de prueba con tarjeta (Stripe); después se cobra el plan elegido. */
export const TRIAL_DAYS = 14;

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
    description: "Ideal para negocios pequeños con un solo empleado.",
    features: [
      "Bot de WhatsApp 24/7",
      "Agenda automática",
      "Hasta 200 conversaciones/mes",
      "Recordatorios 24h",
    ],
  },
  pro: {
    name: "Pro",
    priceLabel: "$35/mes",
    description: "Para negocios con varios empleados y más volumen.",
    features: [
      "Todo lo del plan Básico",
      "Múltiples empleados",
      "Conversaciones ilimitadas",
      "Control manual prioritario",
      "Soporte prioritario",
    ],
  },
};

export function getStripePriceId(plan: PlanId): string {
  const envKey =
    plan === "basic" ? "STRIPE_PRICE_ID_BASIC" : "STRIPE_PRICE_ID_PRO";
  const priceId = process.env[envKey];
  if (!priceId) {
    throw new Error(`${envKey} no configurado en variables de entorno`);
  }
  return priceId;
}
