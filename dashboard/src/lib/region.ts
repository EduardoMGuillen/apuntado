/** Región objetivo: Centroamérica (sin cerrar a un solo país). */
export const CENTRAL_AMERICA = {
  label: "Centroamérica",
  locale: "es_419",
  languageTag: "es",
  countries: [
    { code: "GT", dial: "502", name: "Guatemala", flag: "🇬🇹" },
    { code: "SV", dial: "503", name: "El Salvador", flag: "🇸🇻" },
    { code: "HN", dial: "504", name: "Honduras", flag: "🇭🇳" },
    { code: "NI", dial: "505", name: "Nicaragua", flag: "🇳🇮" },
    { code: "CR", dial: "506", name: "Costa Rica", flag: "🇨🇷" },
    { code: "PA", dial: "507", name: "Panamá", flag: "🇵🇦" },
  ],
} as const;

export const CA_DIAL_CODES = CENTRAL_AMERICA.countries.map((c) => c.dial);

/** +502… +507… (7–8 dígitos locales según país). */
export const CA_PHONE_REGEX = /^\+(502|503|504|505|506|507)\d{7,8}$/;

export const CA_PHONE_ERROR =
  "Usá código de país: +502, +503, +504, +505, +506 o +507";

export const CA_PHONE_PLACEHOLDER = "+504XXXXXXXX";

export const CA_PHONE_HINT =
  "Guatemala +502 · El Salvador +503 · Honduras +504 · Nicaragua +505 · Costa Rica +506 · Panamá +507";

export const CA_CITY_PLACEHOLDER =
  "Ej: San Salvador, Tegucigalpa, San José, Ciudad de Guatemala";

export const CA_FOOTER_FLAGS = "🇬🇹 🇸🇻 🇭🇳 🇳🇮 🇨🇷 🇵🇦";

export function isCentralAmericaPhone(phone: string): boolean {
  return CA_PHONE_REGEX.test(phone.trim());
}

/** Alias histórico — misma validación regional. */
export const isValidHondurasPhone = isCentralAmericaPhone;
