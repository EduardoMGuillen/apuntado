import { addDays, addMonths, format, startOfDay, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

/** Instante UTC del inicio del día calendario en la zona del negocio. */
export function getStartOfBusinessDayUtc(
  timezone: string,
  base: Date = new Date()
): Date {
  const zoned = toZonedTime(base, timezone);
  return fromZonedTime(startOfDay(zoned), timezone);
}

/** Inicio y fin del mes calendario actual en la zona del negocio (fin exclusivo). */
export function getCalendarMonthRangeUtc(
  timezone: string,
  base: Date = new Date()
): { start: Date; end: Date } {
  const zoned = toZonedTime(base, timezone);
  const monthStartLocal = startOfMonth(zoned);
  const nextMonthLocal = addMonths(monthStartLocal, 1);
  return {
    start: fromZonedTime(monthStartLocal, timezone),
    end: fromZonedTime(nextMonthLocal, timezone),
  };
}

/** Etiqueta del mes en curso para mostrar uso (ej. "marzo 2026"). */
export function formatCurrentMonthLabel(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, "MMMM yyyy", { locale: es });
}

/** Rango UTC para consultas Prisma (hoy + N días en zona del negocio). */
export function getBusinessDayRangeUtc(
  timezone: string,
  days: number
): { start: Date; end: Date } {
  const zonedNow = toZonedTime(new Date(), timezone);
  const startLocal = startOfDay(zonedNow);
  const endLocal = addDays(startLocal, days);
  return {
    start: fromZonedTime(startLocal, timezone),
    end: fromZonedTime(endLocal, timezone),
  };
}

/** Bloque para el prompt: hoy / mañana en la zona del negocio. */
export function buildDateContextForPrompt(timezone: string): string {
  const zonedNow = toZonedTime(new Date(), timezone);
  const todayLocal = startOfDay(zonedNow);
  const tomorrowLocal = addDays(todayLocal, 1);

  const nowLabel = format(
    zonedNow,
    "EEEE d 'de' MMMM yyyy · HH:mm",
    { locale: es }
  );
  const todayLabel = format(
    todayLocal,
    "EEEE d 'de' MMMM yyyy",
    { locale: es }
  );
  const tomorrowLabel = format(
    tomorrowLocal,
    "EEEE d 'de' MMMM yyyy",
    { locale: es }
  );

  const offset = formatInTimeZone(new Date(), timezone, "xxx");

  return `FECHA Y HORA DE REFERENCIA (zona del negocio: ${timezone}, offset actual ${offset}):
- Momento actual: ${nowLabel}
- Hoy: ${todayLabel}
- Mañana: ${tomorrowLabel}
- Si el cliente dice "mañana", la cita es el ${tomorrowLabel}, NO hoy.
- Si dice "pasado mañana", sume un día más a partir de mañana.
- En CITA_DATA use scheduledAt en ISO 8601 con el offset de esta zona (ej. 2026-06-04T15:00:00${offset}).`;
}

export function isScheduledAtInPast(
  scheduledAt: Date,
  timezone: string
): boolean {
  const zonedScheduled = toZonedTime(scheduledAt, timezone);
  const zonedNow = toZonedTime(new Date(), timezone);
  return zonedScheduled.getTime() <= zonedNow.getTime();
}
