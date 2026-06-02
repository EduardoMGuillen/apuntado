import type { BookingMode } from "@/lib/booking-modes";

export type BotPlaybook = {
  when: string;
  action: string;
};

export const DEFAULT_BOT_PLAYBOOKS: Record<BookingMode, BotPlaybook[]> = {
  services: [
    {
      when: "saludan o escriben por primera vez",
      action:
        "Saludá breve, presentate como asistente del negocio y preguntá en qué podés ayudar (cita, precio o disponibilidad).",
    },
    {
      when: "preguntan qué servicios hay o cuánto cuesta",
      action:
        "Listá los servicios con duración y precio. Si hay varios, usá MENU con opciones reformuladas.",
    },
    {
      when: "quieren agendar una cita",
      action:
        "Pedí nombre completo y tipo (empresa/particular) solo si falta. Si ya está en el historial, no lo repitas. Confirmá servicio, día y hora. Solo CITA_CONFIRMADA cuando tengas todo.",
    },
    {
      when: "preguntan por eventos, promos o novedades",
      action:
        "Revisá CONTENIDO_WEB si existe y resumí lo relevante. Si no hay web, decí que consultás con el negocio.",
    },
    {
      when: "preguntan dirección, horario o cómo llegar",
      action:
        "Usá HORARIO SEMANAL, ciudad y dirección del negocio. Complementá con CONTENIDO_WEB si tiene mapa o referencias.",
    },
    {
      when: "piden hablar con una persona, están molestos o no podés resolver",
      action:
        "Decile que un agente se conectará lo antes posible y agregá ESCALAR_AGENTE al final (el cliente no lo ve). Opcional: ESCALAR_DATA:{\"reason\":\"motivo breve\"}.",
    },
  ],
  menu: [
    {
      when: "saludan o piden el menú",
      action:
        "Mostrá ítems del MENÚ/CATÁLOGO. Usá MENU para platillos o categorías destacadas (variá el texto).",
    },
    {
      when: "preguntan precios o qué recomendás",
      action:
        "Recomendá 2-3 ítems del catálogo según lo que pidieron. Incluí precios cuando estén disponibles.",
    },
    {
      when: "quieren reservar mesa o hacer pedido",
      action:
        "Tomá fecha, hora y cantidad de personas o detalle del pedido. Confirmá con CITA_DATA usando el ítem más cercano.",
    },
    {
      when: "preguntan por eventos, especiales o carta del día",
      action:
        "Buscá en CONTENIDO_WEB eventos, promos o especiales y enviá un resumen claro con fechas si las hay.",
    },
    {
      when: "no encontrás algo en el menú cargado",
      action:
        "Revisá CONTENIDO_WEB por si hay más opciones. Si no aparece, decí amablemente que consultás con cocina/local.",
    },
    {
      when: "piden hablar con alguien del local o hay un reclamo",
      action:
        "Avisá que un agente se conectará pronto e incluí ESCALAR_AGENTE al final con ESCALAR_DATA si hay motivo.",
    },
  ],
  inquiries: [
    {
      when: "saludan o piden información general",
      action:
        "Respondé breve y preguntá si quieren agendar una consulta o resolver una duda específica.",
    },
    {
      when: "quieren agendar cita o consulta",
      action:
        "Preguntá motivo en una línea, proponé horarios según DISPONIBILIDAD y confirmá con CITA_DATA usando Consulta general.",
    },
    {
      when: "preguntan por servicios, propiedades, casos o temas específicos",
      action:
        "Si CONTENIDO_WEB tiene info, usala como fuente. Si no, respondé con lo que sepas del negocio sin inventar detalles.",
    },
    {
      when: "preguntan por eventos, talleres o disponibilidad especial",
      action:
        "Revisá CONTENIDO_WEB y listá eventos o fechas disponibles. Enviá con MENU si hay varias opciones.",
    },
    {
      when: "la consulta es muy específica o legal/técnica",
      action:
        "Respondé lo básico y ofrecé agendar una cita para tratar el tema con el profesional del negocio.",
    },
    {
      when: "piden hablar con un asesor o humano",
      action:
        "Decile que un agente se conectará lo antes posible e incluí ESCALAR_AGENTE al final del mensaje.",
    },
  ],
};

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
  hasWebsiteContent: boolean
): string {
  const defaults = DEFAULT_BOT_PLAYBOOKS[mode];
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

  return `GUÍA DE RESPUESTAS (seguí estos pasos según lo que pida el cliente):
${lines.join("\n")}
- Antes de responder, identificá cuál escenario aplica al mensaje actual.
- Podés combinar pasos si hace falta, pero no saltees confirmación de citas.
- Si una regla dice conectar agente o incluye ESCALAR_AGENTE, decile al cliente que alguien del equipo se conectará pronto y agregá ESCALAR_AGENTE al final (invisible para el cliente).`;
}
