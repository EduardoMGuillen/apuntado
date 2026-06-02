import type { Subscription } from "@prisma/client";

export type SubscriptionAccess = {
  active: boolean;
  reason?: "trial" | "paid" | "expired" | "past_due" | "canceled" | "pending";
  plan: string;
  status: string;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
};

export function getSubscriptionAccess(
  sub: Subscription | null | undefined
): SubscriptionAccess {
  if (!sub) {
    return {
      active: false,
      reason: "expired",
      plan: "trial",
      status: "expired",
      trialEndsAt: null,
      currentPeriodEnd: null,
    };
  }

  const now = new Date();

  if (sub.status === "pending") {
    return {
      active: false,
      reason: "pending",
      plan: sub.plan,
      status: "pending",
      trialEndsAt: null,
      currentPeriodEnd: null,
    };
  }

  if (sub.status === "past_due") {
    return {
      active: false,
      reason: "past_due",
      plan: sub.plan,
      status: sub.status,
      trialEndsAt: sub.trialEndsAt,
      currentPeriodEnd: sub.currentPeriodEnd,
    };
  }

  if (sub.status === "canceled" || sub.status === "expired") {
    return {
      active: false,
      reason: "canceled",
      plan: sub.plan,
      status: sub.status,
      trialEndsAt: sub.trialEndsAt,
      currentPeriodEnd: sub.currentPeriodEnd,
    };
  }

  if (sub.status === "active") {
    const inTrial = sub.trialEndsAt && sub.trialEndsAt > now;
    const periodValid =
      !!sub.currentPeriodEnd && sub.currentPeriodEnd > now;
    // Activo solo si: trial vigente o periodo de facturación vigente.
    // Evita falsos "activo" cuando ya venció trial/periodo pero quedó stripeSubscriptionId.
    if (inTrial || periodValid) {
      return {
        active: true,
        reason: inTrial ? "trial" : "paid",
        plan: sub.plan,
        status: sub.status,
        trialEndsAt: sub.trialEndsAt,
        currentPeriodEnd: sub.currentPeriodEnd,
      };
    }
  }

  return {
    active: false,
    reason: "expired",
    plan: sub.plan,
    status: sub.status,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodEnd: sub.currentPeriodEnd,
  };
}

export const SUBSCRIPTION_INACTIVE_MESSAGE =
  "Hola, en este momento no podemos atender mensajes automáticos. Por favor contactá al negocio directamente o intentá más tarde. 🙏";
