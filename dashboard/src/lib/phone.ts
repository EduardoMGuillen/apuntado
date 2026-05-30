/** Normaliza a E.164 Honduras (+504XXXXXXXX) cuando es posible. */
export function normalizeWhatsAppPhone(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("lid:")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;

  if (digits.startsWith("504") && digits.length === 11) {
    return `+${digits}`;
  }

  if (digits.length === 8 && /^[39]/.test(digits)) {
    return `+504${digits}`;
  }

  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  if (trimmed.startsWith("+")) return trimmed;
  return `+${digits}`;
}

export function isHondurasMobile(phone: string): boolean {
  return /^\+504[39]\d{7}$/.test(normalizeWhatsAppPhone(phone));
}

/** Ej: +504 9882-3627 */
export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizeWhatsAppPhone(phone);
  const match = normalized.match(/^\+504(\d{4})(\d{4})$/);
  if (match) {
    return `+504 ${match[1]}-${match[2]}`;
  }
  return normalized;
}

/** Título en lista de chats: nombre o teléfono legible. */
export function formatCustomerLabel(
  phone: string,
  name?: string | null
): string {
  if (name?.trim()) return name.trim();
  if (isHondurasMobile(phone)) return formatPhoneDisplay(phone);
  const digits = phone.replace(/\D/g, "");
  if (digits.length > 12) {
    return `Contacto ····${digits.slice(-4)}`;
  }
  return phone;
}

/** Subtítulo: siempre el teléfono formateado si es HN, si no el identificador corto. */
export function formatCustomerSubtitle(phone: string): string {
  if (isHondurasMobile(phone)) return formatPhoneDisplay(phone);
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 8) return `+${digits}`;
  return phone;
}
