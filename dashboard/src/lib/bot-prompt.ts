import { formatInTimeZone } from "date-fns-tz";
import { addDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
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
    return `MODO CONSULTAS (sin catálogo fijo):
- Ayudá a agendar citas o consultas generales.
- Para confirmar una cita usá el servicio "${DEFAULT_INQUIRY_SERVICE.name}" en CITA_DATA.
- Preguntá brevemente el motivo si hace falta, sin ser invasivo.`;
  }

  if (mode === "menu") {
    const lines = active.map((s) => formatCatalogLine(s, mode)).join("\n");
    return `MENÚ / CATÁLOGO:
${lines || "Menú pendiente de configurar."}
- Mostrá opciones cuando pregunten qué hay, precios o recomendaciones.
- Usá MENU con frecuencia para listar platillos o productos (variá el texto cada vez).
- Para reservas de mesa o pedidos, confirmá con CITA_DATA usando el ítem más cercano o "${DEFAULT_INQUIRY_SERVICE.name}" si es reserva general.`;
  }

  const lines = active.map((s) => formatCatalogLine(s, mode)).join("\n");
  return `SERVICIOS:
${lines || "No hay servicios configurados aún."}`;
}

function buildModeIntro(mode: BookingMode): string {
  const config = getBookingModeConfig(mode);
  if (mode === "menu") {
    return `Tu foco principal es mostrar el menú/catálogo y ayudar con reservas o pedidos cuando aplique.`;
  }
  if (mode === "inquiries") {
    return `Tu foco es agendar consultas y responder dudas; no tenés un catálogo fijo de servicios.`;
  }
  return `Tu foco es agendar citas según los servicios disponibles (${config.label.toLowerCase()}).`;
}

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

export function buildSystemPrompt(
  business: BusinessWithRelations,
  availability: string
): string {
  const bookingMode = (business.settings?.bookingMode ?? "services") as BookingMode;
  const catalogSection = buildCatalogSection(business.services, bookingMode);
  const customPlaybooks = parseBotPlaybooks(business.settings?.botPlaybooks);
  const websiteContent = business.websiteContent ?? null;
  const playbooksSection = buildPlaybooksPromptSection(
    bookingMode,
    customPlaybooks,
    !!websiteContent
  );
  const websiteSection = buildWebsiteContextSection(websiteContent);
  const welcomeSection = buildWelcomeMenuPromptSection(
    bookingMode,
    business.settings?.welcomeMenuGreeting,
    business.settings?.welcomeMenuOptions
  );
  const toneSection = buildConversationTonePromptSection(
    parseConversationTone(business.settings?.conversationTone)
  );

  const schedules = business.schedules
    .filter((s) => s.isOpen)
    .map((s) => `- ${DAY_NAMES[s.dayOfWeek]}: ${s.openTime} - ${s.closeTime}`)
    .join("\n");

  const employees = business.employees
    .filter((e) => e.isActive)
    .map((e) => `- ${e.name}`)
    .join("\n");

  const customInstructions = business.settings?.botInstructions
    ? `\nNOTAS ADICIONALES DEL NEGOCIO:\n${business.settings.botInstructions}`
    : "";

  const typeLabel = getBusinessTypeLabel(business.type);

  return `Sos el asistente de WhatsApp de "${business.name}" (${typeLabel}) en ${business.city}, Honduras.
${buildModeIntro(bookingMode)}
Nunca repitas el mismo texto dos veces. Sé breve y amable.

${toneSection}

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

POSIBLES RESPUESTAS (menú interactivo):
- Cuando tenga sentido elegir entre 2 y 6 opciones, agregá UNA línea MENU con JSON al final. El cliente NO la ve; el sistema muestra la lista numerada UNA sola vez.
- NO escribas opciones numeradas (1. 2. 3.) en el texto si vas a usar MENU — solo el mensaje introductorio corto + la línea MENU.
- Formato: MENU:{"prompt":"texto breve opcional","options":["Opción 1","Opción 2"]} — opciones cortas (máx ~22 caracteres).
- Variá el prompt y las etiquetas; no repitas plantillas.
- NO uses MENU en despedidas, mensajes triviales ni cuando el cliente ya escribió texto libre claro.
- Usalo para listar ${bookingMode === "menu" ? "ítems del menú" : bookingMode === "inquiries" ? "horarios o confirmaciones" : "servicios"}, confirmar citas u horarios alternativos.

ESCALAR A AGENTE HUMANO:
- Cuando una regla lo indique, o el cliente pida hablar con una persona, esté molesto o la consulta supere tu alcance:
  1. Respondé amable que un agente del equipo se conectará lo antes posible.
  2. Agregá al final ESCALAR_AGENTE (invisible para el cliente).
  3. Opcional en la línea siguiente: ESCALAR_DATA:{"reason":"motivo breve en español"}
- NO uses ESCALAR_AGENTE si podés resolver vos mismo con la info disponible.
${customInstructions}`.trim();
}

export function verifyVpsSecret(header: string | null): boolean {
  return !!header && header === process.env.VPS_SECRET;
}
