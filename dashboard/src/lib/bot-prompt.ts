import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { addDays, startOfDay } from "date-fns";
import { buildDateContextForPrompt } from "@/lib/business-datetime";
import type { Business, Service, Schedule, Employee } from "@prisma/client";
import { getBusinessTypeLabel } from "@/lib/business-types";
import {
  DEFAULT_INQUIRY_SERVICE,
  getBookingModeConfig,
  type BookingMode,
} from "@/lib/booking-modes";
import {
  buildPlaybooksPromptSection,
  parseBotPlaybooks,
} from "@/lib/bot-playbooks";
import { buildWebsiteContextSection } from "@/lib/website-fetch";
import { buildWelcomeMenuPromptSection } from "@/lib/welcome-menu";
import {
  buildConversationTonePromptSection,
  parseConversationTone,
} from "@/lib/conversation-tones";

const DEFAULT_TZ = "America/Tegucigalpa";

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
  settings: {
    botInstructions: string | null;
    botPlaybooks: string | null;
    websiteUrl: string | null;
    minAdvanceMinutes: number;
    maxAdvanceDays: number;
    bookingMode: string;
    conversationTone: string | null;
    welcomeMenuGreeting: string | null;
    welcomeMenuOptions: string | null;
  } | null;
  websiteContent?: { url: string; text: string } | null;
};

function formatCatalogLine(service: Service, mode: BookingMode): string {
  const price = formatPriceHNL(service.priceHNL.toString());
  const priceNum = parseFloat(service.priceHNL.toString());

  if (mode === "menu") {
    return priceNum > 0 ? `- ${service.name}: ${price}` : `- ${service.name}`;
  }

  return `- ${service.name}: ${service.durationMin} min, ${price}`;
}

function buildCatalogSection(services: Service[], mode: BookingMode): string {
  const active = services.filter((s) => s.isActive);

  if (mode === "inquiries") {
    return `MODO CONSULTAS:
- Agendar citas/consultas. En CITA_DATA usar servicio "${DEFAULT_INQUIRY_SERVICE.name}".
- Motivo breve solo si hace falta.`;
  }

  if (mode === "menu") {
    const lines = active.map((s) => formatCatalogLine(s, mode)).join("\n");
    return `MENÚ / CATÁLOGO:
${lines || "Menú pendiente de configurar."}
- Mostrar opciones ante precios/recomendaciones. Usar MENU para listar ítems (variar texto).
- Reservas/pedidos: CITA_DATA con ítem del catálogo o "${DEFAULT_INQUIRY_SERVICE.name}".`;
  }

  const lines = active.map((s) => formatCatalogLine(s, mode)).join("\n");
  return `SERVICIOS:
${lines || "No hay servicios configurados aún."}`;
}

function buildModeIntro(mode: BookingMode): string {
  const config = getBookingModeConfig(mode);
  if (mode === "menu") {
    return "Foco: menú/catálogo, reservas y pedidos.";
  }
  if (mode === "inquiries") {
    return "Foco: consultas y citas sin catálogo fijo.";
  }
  return `Foco: citas según servicios (${config.label.toLowerCase()}).`;
}

/** Reglas técnicas únicas; el tono (usted/vos) viene de TONO DE CONVERSACIÓN. */
function buildSchedulingRules(
  timezone: string,
  minAdvance: number,
  maxAdvance: number,
  bookingMode: BookingMode
): string {
  const menuHint =
    bookingMode === "menu"
      ? "ítems del menú"
      : bookingMode === "inquiries"
        ? "horarios o confirmaciones"
        : "servicios";

  return `REGLAS TÉCNICAS (aplicar TONO DE CONVERSACIÓN al redactar al cliente):
- Anticipación mín. ${minAdvance} min · máx. ${maxAdvance} días · zona ${timezone}
- Precios en moneda del negocio

CITAS (antes de CITA_CONFIRMADA):
- Nombre completo y clientType (empresa|particular) solo si faltan en historial o DATOS DEL CLIENTE
- Confirmar servicio, fecha y hora según DISPONIBILIDAD; no fechas/horas pasadas
- Requisitos: nombre, clientType, serviceName (texto exacto del catálogo), scheduledAt ISO8601 en ${timezone}
- Tras confirmar: línea CITA_CONFIRMADA (invisible) + CITA_DATA:{"serviceName","scheduledAt","customerName","clientType","employeeName?"}
- Sin mensajes masivos. Si no hay cupo, ofrecer alternativas

MENU (2–6 opciones):
- Una línea MENU:{"prompt?","options":["…"]} al final; opciones ≤22 caracteres; sin listas 1.2.3. en el texto
- No en despedidas/trivial; sí para ${menuHint} u horarios alternativos

ESCALACIÓN:
- Si pide humano, está molesto o no puede resolver: avisar que un agente atenderá + ESCALAR_AGENTE (+ ESCALAR_DATA:{"reason"} opcional)`;
}

export function formatPriceHNL(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `L.${num.toFixed(2)}`;
}

export function buildAvailabilityText(
  schedules: Schedule[],
  existingAppointments: { scheduledAt: Date; endsAt: Date }[],
  timezone: string = DEFAULT_TZ,
  options?: { includesGoogleCalendar?: boolean }
): string {
  const zonedNow = toZonedTime(new Date(), timezone);
  const todayLocal = startOfDay(zonedNow);
  const lines: string[] = [];

  for (let i = 0; i < 3; i++) {
    const dayLocal = addDays(todayLocal, i);
    const dayOfWeek = dayLocal.getDay();
    const schedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);

    const dateLabel = format(dayLocal, "EEEE d/M/yyyy", { locale: es });

    if (!schedule?.isOpen) {
      lines.push(`${dateLabel}: CERRADO`);
      continue;
    }

    lines.push(`${dateLabel}: ${schedule.openTime} - ${schedule.closeTime}`);
  }

  if (existingAppointments.length > 0) {
    const occupiedTitle = options?.includesGoogleCalendar
      ? "\nHorarios ocupados (citas + Google Calendar, próximos 3 días):"
      : "\nCitas ya agendadas (próximos 3 días):";
    lines.push(occupiedTitle);
    const capped = existingAppointments.slice(0, 12);
    for (const apt of capped) {
      const time = formatInTimeZone(apt.scheduledAt, timezone, "EEE d/M HH:mm", { locale: es });
      lines.push(`- ${time}`);
    }
    if (existingAppointments.length > 12) {
      lines.push(`- … y ${existingAppointments.length - 12} más`);
    }
  }

  return lines.join("\n");
}

export function buildSystemPrompt(
  business: BusinessWithRelations,
  availability: string,
  timezone: string = DEFAULT_TZ
): string {
  const bookingMode = (business.settings?.bookingMode ?? "services") as BookingMode;
  const tone = parseConversationTone(business.settings?.conversationTone);
  const catalogSection = buildCatalogSection(business.services, bookingMode);
  const customPlaybooks = parseBotPlaybooks(business.settings?.botPlaybooks);
  const websiteContent = business.websiteContent ?? null;
  const playbooksSection = buildPlaybooksPromptSection(
    bookingMode,
    customPlaybooks,
    !!websiteContent,
    tone
  );
  const websiteSection = buildWebsiteContextSection(websiteContent);
  const welcomeSection = buildWelcomeMenuPromptSection(
    bookingMode,
    business.settings?.welcomeMenuGreeting,
    business.settings?.welcomeMenuOptions,
    tone
  );
  const toneSection = buildConversationTonePromptSection(tone);

  const schedules = business.schedules
    .filter((s) => s.isOpen)
    .map((s) => `- ${DAY_NAMES[s.dayOfWeek]}: ${s.openTime} - ${s.closeTime}`)
    .join("\n");

  const employees = business.employees
    .filter((e) => e.isActive)
    .map((e) => `- ${e.name}`)
    .join("\n");

  const typeLabel = getBusinessTypeLabel(business.type);
  const intro = `Asistente de WhatsApp de "${business.name}" (${typeLabel}) en ${business.city}.
${buildModeIntro(bookingMode)}
Mensajes breves, sin repetir plantillas. El registro (usted/vos) lo define TONO DE CONVERSACIÓN.`;

  const schedulingRules = buildSchedulingRules(
    timezone,
    business.settings?.minAdvanceMinutes ?? 120,
    business.settings?.maxAdvanceDays ?? 30,
    bookingMode
  );
  const dateContext = buildDateContextForPrompt(timezone);

  const customBlock = business.settings?.botInstructions
    ? `\nNOTAS DEL NEGOCIO:\n${business.settings.botInstructions}`
    : "";

  return `${intro}

${toneSection}

${dateContext}

${catalogSection}
${websiteSection}

${playbooksSection}

${welcomeSection}

HORARIO SEMANAL:
${schedules || "Horario no configurado."}

EMPLEADOS:
${employees || "Sin empleados asignados."}

DISPONIBILIDAD (próximos 3 días):
${availability}

${schedulingRules}
${customBlock}`.trim();
}

export function verifyVpsSecret(header: string | null): boolean {
  return !!header && header === process.env.VPS_SECRET;
}
