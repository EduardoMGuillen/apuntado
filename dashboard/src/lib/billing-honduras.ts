/** Pago local Honduras: solo enlace a WhatsApp (sin datos bancarios en la web). */

const DEFAULT_WHATSAPP_E164 = "50498823627";

export const HONDURAS_BILLING_WHATSAPP_MESSAGE =
  "Hola, quiero información sobre el pago vía transferencia en Honduras.";

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function getBillingWhatsAppE164(): string {
  const raw = process.env.NEXT_PUBLIC_BILLING_WHATSAPP?.trim() ?? "";
  const digits = digitsOnly(raw);
  if (digits.length >= 8) {
    return digits.startsWith("504") ? digits : `504${digits}`;
  }
  return DEFAULT_WHATSAPP_E164;
}

export function getBillingWhatsAppDisplay(): string {
  return `+${getBillingWhatsAppE164()}`;
}

export function buildBillingWhatsAppUrl(): string {
  const phone = getBillingWhatsAppE164();
  return `https://wa.me/${phone}?text=${encodeURIComponent(HONDURAS_BILLING_WHATSAPP_MESSAGE)}`;
}
