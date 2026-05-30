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
