import type { Employee, Subscription } from "@prisma/client";
import { isCentralAmericaPhone } from "@/lib/region";

export function isValidCentralAmericaPhone(phone: string): boolean {
  return isCentralAmericaPhone(phone.trim());
}

/** @deprecated */
export const isValidHondurasPhone = isValidCentralAmericaPhone;

export function isProPlan(subscription: Subscription | null | undefined): boolean {
  return subscription?.plan === "pro";
}

export function resolveTeamNotifyPhones({
  notifyPhone,
  employees,
  isPro,
}: {
  notifyPhone: string | null | undefined;
  employees: Pick<Employee, "whatsappPhone" | "isActive">[];
  isPro: boolean;
}): string[] {
  const phones = new Set<string>();

  if (notifyPhone?.trim() && isValidCentralAmericaPhone(notifyPhone)) {
    phones.add(notifyPhone.trim());
  }

  if (isPro) {
    for (const employee of employees) {
      if (!employee.isActive) continue;
      const phone = employee.whatsappPhone?.trim();
      if (phone && isValidCentralAmericaPhone(phone)) {
        phones.add(phone);
      }
    }
  }

  return Array.from(phones);
}

export function buildTeamAlertMessage({
  businessName,
  customerPhone,
  customerMessage,
  reason,
}: {
  businessName: string;
  customerPhone: string;
  customerMessage: string;
  reason?: string;
}): string {
  const rawMessage = customerMessage.trim();
  const isInvalidSnippet =
    !rawMessage ||
    /waiting for message/i.test(rawMessage) ||
    /this may take a while/i.test(rawMessage) ||
    /esperando este mensaje/i.test(rawMessage);
  const normalizedMessage = isInvalidSnippet
    ? "Cliente solicitó hablar con un agente (mensaje no legible)."
    : rawMessage;
  const snippet =
    normalizedMessage.length > 120
      ? `${normalizedMessage.slice(0, 117)}...`
      : normalizedMessage;

  return [
    `🔔 *Cliente esperando respuesta* — ${businessName}`,
    "",
    `📱 Cliente: ${customerPhone}`,
    `💬 Mensaje: "${snippet}"`,
    reason ? `📋 Motivo: ${reason}` : "📋 Motivo: Solicitó hablar con un agente",
    "",
    "Respondé al cliente lo antes posible desde el WhatsApp del negocio.",
  ].join("\n");
}

export const DEFAULT_ESCALATION_REPLY =
  "Gracias por escribir. Un agente de nuestro equipo se conectará contigo lo antes posible. 🙏";
