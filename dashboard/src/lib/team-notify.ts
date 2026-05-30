import type { Employee, Subscription } from "@prisma/client";

const HN_PHONE = /^\+504[39]\d{7}$/;

export function isValidHondurasPhone(phone: string): boolean {
  return HN_PHONE.test(phone.trim());
}

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

  if (notifyPhone?.trim() && isValidHondurasPhone(notifyPhone)) {
    phones.add(notifyPhone.trim());
  }

  if (isPro) {
    for (const employee of employees) {
      if (!employee.isActive) continue;
      const phone = employee.whatsappPhone?.trim();
      if (phone && isValidHondurasPhone(phone)) {
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
  const snippet =
    customerMessage.length > 120
      ? `${customerMessage.slice(0, 117)}...`
      : customerMessage;

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
