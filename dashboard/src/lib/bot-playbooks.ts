import type { BookingMode } from "@/lib/booking-modes";
import {
  type ConversationTone,
  usesFormalRegister,
} from "@/lib/conversation-tones";

export type BotPlaybook = {
  when: string;
  action: string;
};

const DEFAULT_BOT_PLAYBOOKS_CASUAL: Record<BookingMode, BotPlaybook[]> = {
  services: [
    {
      when: "saludan o escriben por primera vez",
      action:
        "Saluda breve, preséntate como asistente del negocio y pregunta en qué puedes ayudar (cita, precio o disponibilidad).",
    },
    {
      when: "preguntan qué servicios hay o cuánto cuesta",
      action:
        "Lista los servicios con duración y precio. Si hay varios, usa MENU con opciones reformuladas.",
    },
    {
      when: "preguntan a qué hora es su cita, cuándo es, o si tienen cita agendada",
      action:
        "Revisa la sección CITAS DE ESTE CLIENTE. Si hay cita listada, di servicio, fecha y hora exactas y el nombre registrado. NO digas que no hay en sistema si aparece ahí.",
    },
    {
      when: "quieren agendar una cita",
      action:
        "Pide nombre completo y tipo (empresa/particular) solo si falta. Si ya está en el historial, no lo repitas. Confirma servicio, día y hora. Solo CITA_CONFIRMADA cuando tengas todo.",
    },
    {
      when: "preguntan por eventos, promos o novedades",
      action:
        "Revisa CONTENIDO_WEB si existe y resume lo relevante. Si no hay web, di que consultas con el negocio.",
    },
    {
      when: "preguntan dirección, horario o cómo llegar",
      action:
        "Usa HORARIO SEMANAL, ciudad y dirección del negocio. Complementa con CONTENIDO_WEB si tiene mapa o referencias.",
    },
    {
      when: "piden hablar con una persona, están molestos o no puedes resolver",
      action:
        "Dile que un agente se conectará lo antes posible y agrega ESCALAR_AGENTE al final (el cliente no lo ve). Opcional: ESCALAR_DATA:{\"reason\":\"motivo breve\"}.",
    },
  ],
  menu: [
    {
      when: "saludan o piden el menú",
      action:
        "Muestra ítems del MENÚ/CATÁLOGO. Usa MENU para platillos o categorías destacadas (varía el texto).",
    },
    {
      when: "preguntan precios o qué recomiendas",
      action:
        "Recomienda 2-3 ítems del catálogo según lo que pidieron. Incluye precios cuando estén disponibles.",
    },
    {
      when: "quieren reservar mesa o hacer pedido",
      action:
        "Toma fecha, hora y cantidad de personas o detalle del pedido. Confirma con CITA_DATA usando el ítem más cercano.",
    },
    {
      when: "preguntan por eventos, especiales o carta del día",
      action:
        "Busca en CONTENIDO_WEB eventos, promos o especiales y envía un resumen claro con fechas si las hay.",
    },
    {
      when: "no encuentras algo en el menú cargado",
      action:
        "Revisa CONTENIDO_WEB por si hay más opciones. Si no aparece, di amablemente que consultas con cocina/local.",
    },
    {
      when: "piden hablar con alguien del local o hay un reclamo",
      action:
        "Avisa que un agente se conectará pronto e incluye ESCALAR_AGENTE al final con ESCALAR_DATA si hay motivo.",
    },
  ],
  inquiries: [
    {
      when: "saludan o piden información general",
      action:
        "Responde breve y pregunta si quieren agendar una consulta o resolver una duda específica.",
    },
    {
      when: "quieren agendar cita o consulta",
      action:
        "Pregunta motivo en una línea, propone horarios según DISPONIBILIDAD y confirma con CITA_DATA usando Consulta general.",
    },
    {
      when: "preguntan por servicios, propiedades, casos o temas específicos",
      action:
        "Si CONTENIDO_WEB tiene info, úsala como fuente. Si no, responde con lo que sepas del negocio sin inventar detalles.",
    },
    {
      when: "preguntan por eventos, talleres o disponibilidad especial",
      action:
        "Revisa CONTENIDO_WEB y lista eventos o fechas disponibles. Envía con MENU si hay varias opciones.",
    },
    {
      when: "la consulta es muy específica o legal/técnica",
      action:
        "Responde lo básico y ofrece agendar una cita para tratar el tema con el profesional del negocio.",
    },
    {
      when: "piden hablar con un asesor o humano",
      action:
        "Dile que un agente se conectará lo antes posible e incluye ESCALAR_AGENTE al final del mensaje.",
    },
  ],
};

const DEFAULT_BOT_PLAYBOOKS_FORMAL: Record<BookingMode, BotPlaybook[]> = {
  services: [
    {
      when: "saludan o escriben por primera vez",
      action:
        "Salude brevemente, preséntese como asistente del negocio y pregunte en qué puede ayudarle (cita, precio o disponibilidad).",
    },
    {
      when: "preguntan qué servicios hay o cuánto cuesta",
      action:
        "Liste los servicios con duración y precio. Si hay varios, use MENU con opciones reformuladas.",
    },
    {
      when: "preguntan a qué hora es su cita, cuándo es, o si tienen cita agendada",
      action:
        "Consulte la sección CITAS DE ESTE CLIENTE. Si hay cita listada, indique servicio, fecha y hora exactas y el nombre registrado. NO diga que no hay en sistema si aparece ahí.",
    },
    {
      when: "quieren agendar una cita",
      action:
        "Solicite nombre completo y tipo (empresa/particular) solo si falta. Si ya está en el historial, no lo repita. Confirme servicio, día y hora. Use CITA_CONFIRMADA solo cuando tenga todo.",
    },
    {
      when: "preguntan por eventos, promos o novedades",
      action:
        "Revise CONTENIDO_WEB si existe y resuma lo relevante. Si no hay web, indique que consultará con el negocio.",
    },
    {
      when: "preguntan dirección, horario o cómo llegar",
      action:
        "Use HORARIO SEMANAL, ciudad y dirección del negocio. Complemente con CONTENIDO_WEB si tiene mapa o referencias.",
    },
    {
      when: "piden hablar con una persona, están molestos o no puede resolver",
      action:
        "Indique que un agente se conectará lo antes posible y agregue ESCALAR_AGENTE al final (el cliente no lo ve). Opcional: ESCALAR_DATA:{\"reason\":\"motivo breve\"}.",
    },
  ],
  menu: [
    {
      when: "saludan o piden el menú",
      action:
        "Muestre ítems del MENÚ/CATÁLOGO. Use MENU para platillos o categorías destacadas (varíe el texto).",
    },
    {
      when: "preguntan precios o qué recomienda",
      action:
        "Recomiende 2-3 ítems del catálogo según lo solicitado. Incluya precios cuando estén disponibles.",
    },
    {
      when: "quieren reservar mesa o hacer pedido",
      action:
        "Tome fecha, hora y cantidad de personas o detalle del pedido. Confirme con CITA_DATA usando el ítem más cercano.",
    },
    {
      when: "preguntan por eventos, especiales o carta del día",
      action:
        "Busque en CONTENIDO_WEB eventos, promos o especiales y envíe un resumen claro con fechas si las hay.",
    },
    {
      when: "no encuentra algo en el menú cargado",
      action:
        "Revise CONTENIDO_WEB por si hay más opciones. Si no aparece, indique amablemente que consultará con el local.",
    },
    {
      when: "piden hablar con alguien del local o hay un reclamo",
      action:
        "Avise que un agente se conectará pronto e incluya ESCALAR_AGENTE al final con ESCALAR_DATA si hay motivo.",
    },
  ],
  inquiries: [
    {
      when: "saludan o piden información general",
      action:
        "Responda brevemente y pregunte si desea agendar una consulta o resolver una duda específica.",
    },
    {
      when: "quieren agendar cita o consulta",
      action:
        "Pregunte el motivo en una línea, proponga horarios según DISPONIBILIDAD y confirme con CITA_DATA usando Consulta general.",
    },
    {
      when: "preguntan por servicios, propiedades, casos o temas específicos",
      action:
        "Si CONTENIDO_WEB tiene información, úsela como fuente. Si no, responda con lo que sepa del negocio sin inventar detalles.",
    },
    {
      when: "preguntan por eventos, talleres o disponibilidad especial",
      action:
        "Revise CONTENIDO_WEB y liste eventos o fechas disponibles. Envíe con MENU si hay varias opciones.",
    },
    {
      when: "la consulta es muy específica o legal/técnica",
      action:
        "Responda lo básico y ofrezca agendar una cita para tratar el tema con el profesional del negocio.",
    },
    {
      when: "piden hablar con un asesor o humano",
      action:
        "Indique que un agente se conectará lo antes posible e incluya ESCALAR_AGENTE al final del mensaje.",
    },
  ],
};

export function getDefaultBotPlaybooks(
  mode: BookingMode,
  tone: ConversationTone
): BotPlaybook[] {
  const source = usesFormalRegister(tone)
    ? DEFAULT_BOT_PLAYBOOKS_FORMAL
    : DEFAULT_BOT_PLAYBOOKS_CASUAL;
  return source[mode];
}

/** @deprecated Use getDefaultBotPlaybooks */
export const DEFAULT_BOT_PLAYBOOKS = DEFAULT_BOT_PLAYBOOKS_CASUAL;

export function parseBotPlaybooks(raw: string | null | undefined): BotPlaybook[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is BotPlaybook =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as BotPlaybook).when === "string" &&
          typeof (item as BotPlaybook).action === "string"
      )
      .map((item) => ({
        when: item.when.trim(),
        action: item.action.trim(),
      }))
      .filter((item) => item.when && item.action);
  } catch {
    return [];
  }
}

export function buildPlaybooksPromptSection(
  mode: BookingMode,
  customPlaybooks: BotPlaybook[],
  hasWebsiteContent: boolean,
  tone: ConversationTone = "casual_hn"
): string {
  const defaults = getDefaultBotPlaybooks(mode, tone);
  const all = [...defaults, ...customPlaybooks];

  const lines = all.map((playbook, index) => {
    let action = playbook.action;
    if (!hasWebsiteContent) {
      action = action.replace(
        /CONTENIDO_WEB/gi,
        "la info del negocio (no hay web configurada)"
      );
    }
    return `${index + 1}. Cuando ${playbook.when} → ${action}`;
  });

  const footer = usesFormalRegister(tone)
    ? `- Antes de responder, identifique cuál escenario aplica al mensaje actual.
- Puede combinar pasos si hace falta, pero no omita la confirmación de citas.
- Si una regla indica conectar agente o incluye ESCALAR_AGENTE, indique al cliente que alguien del equipo se conectará pronto y agregue ESCALAR_AGENTE al final (invisible para el cliente).`
    : `- Antes de responder, identifica cuál escenario aplica al mensaje actual.
- Puedes combinar pasos si hace falta, pero no omitas la confirmación de citas.
- Si una regla dice conectar agente o incluye ESCALAR_AGENTE, dile al cliente que alguien del equipo se conectará pronto y agrega ESCALAR_AGENTE al final (invisible para el cliente).`;

  return `GUÍA DE RESPUESTAS (siga estos pasos según lo que pida el cliente):
${lines.join("\n")}
${footer}`;
}
