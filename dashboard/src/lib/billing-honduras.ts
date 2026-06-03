/** Pagos locales Honduras: transferencia Click + WhatsApp Nexus (configurable por env). */

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

export type HondurasBillingConfig = {
  whatsappE164: string | null;
  whatsappDisplay: string | null;
  clickHolder: string | null;
  clickBank: string | null;
  clickAccount: string | null;
  configured: boolean;
};

export function getHondurasBillingConfig(): HondurasBillingConfig {
  const raw = process.env.NEXT_PUBLIC_BILLING_WHATSAPP?.trim() ?? "";
  const digits = digitsOnly(raw);
  const whatsappE164 =
    digits.length >= 8 ? (digits.startsWith("504") ? digits : `504${digits}`) : null;

  const clickHolder = process.env.NEXT_PUBLIC_CLICK_ACCOUNT_HOLDER?.trim() || null;
  const clickBank = process.env.NEXT_PUBLIC_CLICK_BANK?.trim() || null;
  const clickAccount = process.env.NEXT_PUBLIC_CLICK_ACCOUNT?.trim() || null;

  const configured = !!(whatsappE164 || (clickBank && clickAccount));

  return {
    whatsappE164,
    whatsappDisplay: whatsappE164 ? `+${whatsappE164}` : null,
    clickHolder,
    clickBank,
    clickAccount,
    configured,
  };
}

export function buildBillingWhatsAppUrl(
  businessName: string,
  planLabel: string
): string | null {
  const { whatsappE164 } = getHondurasBillingConfig();
  if (!whatsappE164) return null;

  const text = [
    "Hola, quiero activar Apuntado.",
    `Negocio: ${businessName}`,
    `Plan: ${planLabel}`,
    "Pago: transferencia Click (adjunto comprobante).",
  ].join(" ");

  return `https://wa.me/${whatsappE164}?text=${encodeURIComponent(text)}`;
}
