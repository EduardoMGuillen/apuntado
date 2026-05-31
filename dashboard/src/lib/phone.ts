import {
  CA_DIAL_CODES,
  isCentralAmericaPhone,
} from "@/lib/region";

/** Normaliza a E.164 (+502… +507…) cuando es posible. */
export function normalizeWhatsAppPhone(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("lid:")) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;

  for (const code of CA_DIAL_CODES) {
    if (digits.startsWith(code)) {
      const localLen = digits.length - code.length;
      if (localLen >= 7 && localLen <= 8) {
        return `+${digits}`;
      }
    }
  }

  // 8 dígitos sin código: asumir Honduras (+504) por compatibilidad
  if (digits.length === 8 && /^[39]/.test(digits)) {
    return `+504${digits}`;
  }

  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  if (trimmed.startsWith("+")) return trimmed;
  return `+${digits}`;
}

export function isCentralAmericaMobile(phone: string): boolean {
  return isCentralAmericaPhone(normalizeWhatsAppPhone(phone));
}

/** @deprecated Usar isCentralAmericaMobile */
export const isHondurasMobile = isCentralAmericaMobile;

/** Ej: +504 9882-3627 · +502 1234-5678 */
export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizeWhatsAppPhone(phone);
  const match = normalized.match(/^(\+502|\+503|\+504|\+505|\+506|\+507)(\d{4})(\d{3,4})$/);
  if (match) {
    return `${match[1]} ${match[2]}-${match[3]}`;
  }
  return normalized;
}

export function formatCustomerLabel(
  phone: string,
  name?: string | null
): string {
  if (name?.trim()) return name.trim();
  if (isCentralAmericaMobile(phone)) return formatPhoneDisplay(phone);
  const digits = phone.replace(/\D/g, "");
  if (digits.length > 12) {
    return `Contacto ····${digits.slice(-4)}`;
  }
  return phone;
}

export function formatCustomerSubtitle(phone: string): string {
  if (isCentralAmericaMobile(phone)) return formatPhoneDisplay(phone);
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 8) return `+${digits}`;
  return phone;
}
