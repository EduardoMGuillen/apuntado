import { CA_DIAL_CODES } from "./region.js";

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
  return /^\+(502|503|504|505|506|507)\d{7,8}$/.test(
    normalizeWhatsAppPhone(phone)
  );
}

/** @deprecated */
export const isHondurasMobile = isCentralAmericaMobile;
