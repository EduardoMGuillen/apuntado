import { PLAN_PRICE_HNL, PLAN_PRICE_USD, type PlanId } from "@/lib/plans";

export const MARKETING_VALUE_LINES = [
  "Menos que media jornada de recepcionista en Honduras",
  "Menos que un CRM de WhatsApp con API oficial y cargos por mensaje",
  "Suscripción todo incluido: sin sumar costos Meta por cada chat",
] as const;

export const MARKETING_LEGAL_NOTE =
  "Apuntado conecta el WhatsApp de tu negocio para automatizar citas. No somos proveedor oficial (BSP) de Meta ni vendemos la WhatsApp Business API con plantillas masivas.";

export const MARKETING_TRANSPARENCY_NOTE =
  "Una cuota mensual fija: bot, agenda, recordatorios y panel. Sin factura extra de Meta por mensaje como en plataformas con API oficial.";

export function formatPlanPriceHn(plan: PlanId): string {
  return `~L. ${PLAN_PRICE_HNL[plan].toLocaleString("es-HN")}`;
}

export function formatPlanPriceUsd(plan: PlanId): string {
  return `$${PLAN_PRICE_USD[plan]} USD`;
}
