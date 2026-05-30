import { formatInTimeZone } from "date-fns-tz";
import { addDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import type { Business, Service, Schedule, Employee } from "@prisma/client";
import { getBusinessTypeLabel } from "@/lib/business-types";

const TZ = "America/Tegucigalpa";

const DAY_NAMES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

type BusinessWithRelations = Business & {
  services: Service[];
  schedules: Schedule[];
  employees: Employee[];
  settings: { botInstructions: string | null; minAdvanceMinutes: number; maxAdvanceDays: number } | null;
};

export function formatPriceHNL(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `L.${num.toFixed(2)}`;
}

export function buildAvailabilityText(
  schedules: Schedule[],
  existingAppointments: { scheduledAt: Date; endsAt: Date }[]
): string {
  const today = startOfDay(new Date());
  const lines: string[] = [];

  for (let i = 0; i < 3; i++) {
    const date = addDays(today, i);
    const dayOfWeek = date.getDay();
    const schedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);

    const dateLabel = formatInTimeZone(date, TZ, "EEEE d/M", { locale: es });

    if (!schedule?.isOpen) {
      lines.push(`${dateLabel}: CERRADO`);
      continue;
    }

    lines.push(`${dateLabel}: ${schedule.openTime} - ${schedule.closeTime}`);
  }

  if (existingAppointments.length > 0) {
    lines.push("\nCitas ya agendadas (próximos 3 días):");
    for (const apt of existingAppointments) {
      const time = formatInTimeZone(apt.scheduledAt, TZ, "EEE d/M HH:mm", { locale: es });
      lines.push(`- ${time}`);
    }
  }

  return lines.join("\n");
}

export function buildSystemPrompt(business: BusinessWithRelations, availability: string): string {
  const services = business.services
    .filter((s) => s.isActive)
    .map((s) => `- ${s.name}: ${s.durationMin} min, ${formatPriceHNL(s.priceHNL.toString())}`)
    .join("\n");

  const schedules = business.schedules
    .filter((s) => s.isOpen)
    .map((s) => `- ${DAY_NAMES[s.dayOfWeek]}: ${s.openTime} - ${s.closeTime}`)
    .join("\n");

  const employees = business.employees
    .filter((e) => e.isActive)
    .map((e) => `- ${e.name}`)
    .join("\n");

  const customInstructions = business.settings?.botInstructions
    ? `\nInstrucciones adicionales del negocio:\n${business.settings.botInstructions}`
    : "";

  const typeLabel = getBusinessTypeLabel(business.type);

  return `Sos el asistente de WhatsApp de "${business.name}" (${typeLabel}) en ${business.city}, Honduras.
Tu trabajo es ayudar a clientes a agendar citas de forma natural, en español hondureño casual (usá "vos", "cheque", "pa'", etc.).
Nunca repitas el mismo texto dos veces. Sé breve y amable.

SERVICIOS:
${services || "No hay servicios configurados aún."}

HORARIO SEMANAL:
${schedules || "Horario no configurado."}

EMPLEADOS:
${employees || "Sin empleados asignados."}

DISPONIBILIDAD (próximos 3 días):
${availability}

REGLAS:
- Anticipación mínima: ${business.settings?.minAdvanceMinutes ?? 120} minutos
- Máximo ${business.settings?.maxAdvanceDays ?? 30} días de anticipación
- Moneda: Lempiras (L.)
- Zona horaria: Honduras (UTC-6)
- Cuando confirmes una cita, incluí la palabra exacta CITA_CONFIRMADA al final (el cliente NO la verá)
- En la línea siguiente a CITA_CONFIRMADA, incluí: CITA_DATA:{"serviceName":"...","scheduledAt":"ISO8601","employeeName":"..."}
- scheduledAt debe ser ISO 8601 en zona America/Tegucigalpa
- NO enviés mensajes masivos ni promociones
- Si no hay disponibilidad, ofrecé alternativas

POSIBLES RESPUESTAS (menú):
- Cuando tenga sentido elegir entre 2 y 6 opciones concretas (servicios, confirmar sí/no, horarios sugeridos), podés agregar al final una línea MENU con JSON. El cliente NO la ve.
- Variá el texto introductorio y las etiquetas cada vez para que no suenen a bot ni plantilla fija.
- Reformulá las opciones con tono natural hondureño (ej. "Corte clásico", "Nomás barba", "Combo full", "Mañana temprano", "Sí, confirmá").
- Formato: MENU:{"options":["Opción 1","Opción 2"]} — opciones cortas (máx ~22 caracteres).
- NO uses MENU en saludos, despedidas, mensajes triviales ni cuando el cliente ya escribió texto libre claro.
- Usalo sobre todo para listar servicios, confirmar citas o proponer horarios alternativos.
${customInstructions}`.trim();
}

export function verifyVpsSecret(header: string | null): boolean {
  return !!header && header === process.env.VPS_SECRET;
}
