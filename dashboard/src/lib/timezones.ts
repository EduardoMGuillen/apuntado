export const DEFAULT_TIMEZONE = "America/Tegucigalpa";

export const BUSINESS_TIMEZONES = [
  { value: "America/Tegucigalpa", label: "Honduras (UTC-6)" },
  { value: "America/Guatemala", label: "Guatemala (UTC-6)" },
  { value: "America/El_Salvador", label: "El Salvador (UTC-6)" },
  { value: "America/Managua", label: "Nicaragua (UTC-6)" },
  { value: "America/Costa_Rica", label: "Costa Rica (UTC-6)" },
  { value: "America/Panama", label: "Panamá (UTC-5)" },
] as const;

export type BusinessTimezone = (typeof BUSINESS_TIMEZONES)[number]["value"];

const TZ_SET = new Set<string>(BUSINESS_TIMEZONES.map((tz) => tz.value));

export function isBusinessTimezone(value: string): value is BusinessTimezone {
  return TZ_SET.has(value);
}

export function resolveBusinessTimezone(value?: string | null): BusinessTimezone {
  if (value && isBusinessTimezone(value)) return value;
  return DEFAULT_TIMEZONE;
}
