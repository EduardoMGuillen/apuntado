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
  usesFormalRegister,
  type ConversationTone,
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

function buildCatalogSection(
  services: Service[],
  mode: BookingMode,
  tone: ConversationTone
): string {
  const active = services.filter((s) => s.isActive);
  const formal = usesFormalRegister(tone);

  if (mode === "inquiries") {
    return formal
      ? `MODO CONSULTAS (sin catálogo fijo):
- Ayude a agendar citas o consultas generales.
- Para confirmar una cita use el servicio "${DEFAULT_INQUIRY_SERVICE.name}" en CITA_DATA.
- Pregunte brevemente el motivo si hace falta, sin ser invasivo.`
      : `MODO CONSULTAS (sin catálogo fijo):
- Ayudá a agendar citas o consultas generales.
- Para confirmar una cita usá el servicio "${DEFAULT_INQUIRY_SERVICE.name}" en CITA_DATA.
- Preguntá brevemente el motivo si hace falta, sin ser invasivo.`;
  }

  if (mode === "menu") {
    const lines = active.map((s) => formatCatalogLine(s, mode)).join("\n");
    return formal
      ? `MENÚ / CATÁLOGO:
${lines || "Menú pendiente de configurar."}
- Muestre opciones cuando pregunten qué hay, precios o recomendaciones.
- Use MENU con frecuencia para listar platillos o productos (varíe el texto cada vez).
- Para reservas de mesa o pedidos, confirme con CITA_DATA usando el ítem más cercano o "${DEFAULT_INQUIRY_SERVICE.name}" si es reserva general.`
      : `MENÚ / CATÁLOGO:
${lines || "Menú pendiente de configurar."}
- Mostrá opciones cuando pregunten qué hay, precios o recomendaciones.
- Usá MENU con frecuencia para listar platillos o productos (variá el texto cada vez).
- Para reservas de mesa o pedidos, confirmá con CITA_DATA usando el ítem más cercano o "${DEFAULT_INQUIRY_SERVICE.name}" si es reserva general.`;
  }

  const lines = active.map((s) => formatCatalogLine(s, mode)).join("\n");
  return `SERVICIOS:
${lines || "No hay servicios configurados aún."}`;
}

function buildModeIntro(mode: BookingMode, tone: ConversationTone): string {
  const config = getBookingModeConfig(mode);
  const formal = usesFormalRegister(tone);
  if (mode === "menu") {
    return formal
      ? "Su foco principal es mostrar el menú/catálogo y ayudar con reservas o pedidos cuando aplique."
      : "Tu foco principal es mostrar el menú/catálogo y ayudar con reservas o pedidos cuando aplique.";
  }
  if (mode === "inquiries") {
    return formal
      ? "Su foco es agendar consultas y responder dudas; no tiene un catálogo fijo de servicios."
      : "Tu foco es agendar consultas y responder dudas; no tenés un catálogo fijo de servicios.";
  }
  return formal
    ? `Su foco es agendar citas según los servicios disponibles (${config.label.toLowerCase()}).`
    : `Tu foco es agendar citas según los servicios disponibles (${config.label.toLowerCase()}).`;
}

function buildSchedulingRules(
  tone: ConversationTone,
  timezone: string,
  minAdvance: number,
  maxAdvance: number,
  bookingMode: BookingMode
): string {
  const formal = usesFormalRegister(tone);
  const menuHint =
    bookingMode === "menu"
      ? "ítems del menú"
      : bookingMode === "inquiries"
        ? "horarios o confirmaciones"
        : "servicios";

  if (formal) {
    return `REGLAS:
- Anticipación mínima: ${minAdvance} minutos
- Máximo ${maxAdvance} días de anticipación
- Moneda: la que use el negocio (indique precios con claridad)
- Zona horaria del negocio: ${timezone}

AGENDAR CITAS (obligatorio antes de confirmar):
- Solicite nombre completo y tipo de cliente (empresa o particular) SOLO si aún no los tiene.
- Si en el historial o en DATOS DEL CLIENTE ya aparece nombre o tipo, NO lo pregunte de nuevo.
- Confirme servicio, fecha y hora según DISPONIBILIDAD.
- NO use CITA_CONFIRMADA hasta tener: nombre, tipo (empresa/particular), servicio, fecha y hora.
- Cuando confirme, incluya la palabra exacta CITA_CONFIRMADA al final (el cliente NO la verá).
- En la línea siguiente: CITA_DATA:{"serviceName":"nombre exacto del catálogo","scheduledAt":"ISO8601","customerName":"Nombre Apellido","clientType":"particular","employeeName":"opcional"}
- clientType solo puede ser "empresa" o "particular".
- serviceName debe coincidir con un ítem del catálogo de arriba (copie el texto exacto).
- scheduledAt en ISO 8601 y en la zona horaria ${timezone} (ej. 2026-05-31T15:00:00-06:00).
- NO permita agendar en horarios o fechas ya pasadas.
- NO envíe mensajes masivos ni promociones.
- Si no hay disponibilidad, ofrezca alternativas.

POSIBLES RESPUESTAS (menú interactivo):
- Cuando tenga sentido elegir entre 2 y 6 opciones, agregue UNA línea MENU con JSON al final. El cliente NO la ve.
- NO escriba opciones numeradas (1. 2. 3.) en el texto si va a usar MENU — solo el mensaje introductorio corto + la línea MENU.
- Formato: MENU:{"prompt":"texto breve opcional","options":["Opción 1","Opción 2"]} — opciones cortas (máx ~22 caracteres).
- Varíe el prompt y las etiquetas; no repita plantillas.
- NO use MENU en despedidas, mensajes triviales ni cuando el cliente ya escribió texto libre claro.
- Úselo para listar ${menuHint}, confirmar citas u horarios alternativos.

ESCALAR A AGENTE HUMANO:
- Cuando una regla lo indique, o el cliente pida hablar con una persona, esté molesto o la consulta supere su alcance:
  1. Responda amablemente que un agente del equipo se conectará lo antes posible.
  2. Agregue al final ESCALAR_AGENTE (invisible para el cliente).
  3. Opcional en la línea siguiente: ESCALAR_DATA:{"reason":"motivo breve en español"}
- NO use ESCALAR_AGENTE si puede resolver usted mismo con la información disponible.`;
  }

  return `REGLAS:
- Anticipación mínima: ${minAdvance} minutos
- Máximo ${maxAdvance} días de anticipación
- Moneda: Lempiras (L.) u otra moneda local que use el negocio
- Zona horaria del negocio: ${timezone}

AGENDAR CITAS (obligatorio antes de confirmar):
- Pedí nombre completo y tipo de cliente (empresa o particular) SOLO si aún no lo tenés.
- Si en el historial o en DATOS DEL CLIENTE ya aparece nombre o tipo, NO lo preguntés de nuevo.
- Confirmá servicio, fecha y hora según DISPONIBILIDAD.
- NO uses CITA_CONFIRMADA hasta tener: nombre, tipo (empresa/particular), servicio, fecha y hora.
- Cuando confirmes, incluí la palabra exacta CITA_CONFIRMADA al final (el cliente NO la verá).
- En la línea siguiente: CITA_DATA:{"serviceName":"nombre exacto del catálogo","scheduledAt":"ISO8601","customerName":"Nombre Apellido","clientType":"particular","employeeName":"opcional"}
- clientType solo puede ser "empresa" o "particular".
- serviceName debe coincidir con un ítem del catálogo de arriba (copiá el texto exacto).
- scheduledAt en ISO 8601 y en la zona horaria ${timezone} (ej. 2026-05-31T15:00:00-06:00).
- NO permitás agendar en horarios/fechas ya pasadas para la zona horaria del negocio.
- NO enviés mensajes masivos ni promociones
- Si no hay disponibilidad, ofrecé alternativas

POSIBLES RESPUESTAS (menú interactivo):
- Cuando tenga sentido elegir entre 2 y 6 opciones, agregá UNA línea MENU con JSON al final. El cliente NO la ve; el sistema muestra la lista numerada UNA sola vez.
- NO escribas opciones numeradas (1. 2. 3.) en el texto si vas a usar MENU — solo el mensaje introductorio corto + la línea MENU.
- Formato: MENU:{"prompt":"texto breve opcional","options":["Opción 1","Opción 2"]} — opciones cortas (máx ~22 caracteres).
- Variá el prompt y las etiquetas; no repitas plantillas.
- NO uses MENU en despedidas, mensajes triviales ni cuando el cliente ya escribió texto libre claro.
- Usalo para listar ${menuHint}, confirmar citas u horarios alternativos.

ESCALAR A AGENTE HUMANO:
- Cuando una regla lo indique, o el cliente pida hablar con una persona, esté molesto o la consulta supere tu alcance:
  1. Respondé amable que un agente del equipo se conectará lo antes posible.
  2. Agregá al final ESCALAR_AGENTE (invisible para el cliente).
  3. Opcional en la línea siguiente: ESCALAR_DATA:{"reason":"motivo breve en español"}
- NO uses ESCALAR_AGENTE si podés resolver vos mismo con la info disponible.`;
}

export function formatPriceHNL(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `L.${num.toFixed(2)}`;
}

export function buildAvailabilityText(
  schedules: Schedule[],
  existingAppointments: { scheduledAt: Date; endsAt: Date }[],
  timezone: string = DEFAULT_TZ
): string {
  const today = startOfDay(new Date());
  const lines: string[] = [];

  for (let i = 0; i < 3; i++) {
    const date = addDays(today, i);
    const dayOfWeek = date.getDay();
    const schedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);

    const dateLabel = formatInTimeZone(date, timezone, "EEEE d/M", { locale: es });

    if (!schedule?.isOpen) {
      lines.push(`${dateLabel}: CERRADO`);
      continue;
    }

    lines.push(`${dateLabel}: ${schedule.openTime} - ${schedule.closeTime}`);
  }

  if (existingAppointments.length > 0) {
    lines.push("\nCitas ya agendadas (próximos 3 días):");
    for (const apt of existingAppointments) {
      const time = formatInTimeZone(apt.scheduledAt, timezone, "EEE d/M HH:mm", { locale: es });
      lines.push(`- ${time}`);
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
  const formal = usesFormalRegister(tone);
  const catalogSection = buildCatalogSection(business.services, bookingMode, tone);
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
  const intro = formal
    ? `Usted es el asistente de WhatsApp de "${business.name}" (${typeLabel}) en ${business.city}.
${buildModeIntro(bookingMode, tone)}
No repita el mismo texto dos veces. Sea breve, claro y profesional.`
    : `Sos el asistente de WhatsApp de "${business.name}" (${typeLabel}) en ${business.city}, Centroamérica.
${buildModeIntro(bookingMode, tone)}
Nunca repitas el mismo texto dos veces. Sé breve y amable.`;

  const schedulingRules = buildSchedulingRules(
    tone,
    timezone,
    business.settings?.minAdvanceMinutes ?? 120,
    business.settings?.maxAdvanceDays ?? 30,
    bookingMode
  );

  const notesPrefix = formal
    ? "\nNOTAS ADICIONALES DEL NEGOCIO (respete el tono formal salvo instrucción explícita en contra):\n"
    : "\nNOTAS ADICIONALES DEL NEGOCIO:\n";
  const customBlock = business.settings?.botInstructions
    ? `${notesPrefix}${business.settings.botInstructions}`
    : "";

  return `${intro}

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

${schedulingRules}
${customBlock}`.trim();
}

export function verifyVpsSecret(header: string | null): boolean {
  return !!header && header === process.env.VPS_SECRET;
}
