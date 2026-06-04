import type { BookingMode } from "@/lib/booking-modes";
import {
  type ConversationTone,
  usesFormalRegister,
} from "@/lib/conversation-tones";

export const WELCOME_MENU_MAX_OPTIONS = 6;
export const WELCOME_MENU_MIN_OPTIONS = 2;

export const DEFAULT_WELCOME_GREETING = "¡Hola! Estas son las opciones:";

export const DEFAULT_WELCOME_OPTIONS: Record<BookingMode, string[]> = {
  services: [
    "Agendar una cita",
    "Ver servicios y precios",
    "Horario del negocio",
    "Hablar con un agente",
  ],
  menu: [
    "Ver el menú",
    "Hacer un pedido",
    "Reservar mesa",
    "Hablar con un agente",
  ],
  inquiries: [
    "Agendar una consulta",
    "Horario y ubicación",
    "Hablar con un agente",
  ],
};

export function parseWelcomeMenuOptions(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, WELCOME_MENU_MAX_OPTIONS);
  } catch {
    return [];
  }
}

export function resolveWelcomeMenu(
  bookingMode: BookingMode,
  greeting: string | null | undefined,
  optionsRaw: string | null | undefined
) {
  const parsed = parseWelcomeMenuOptions(optionsRaw);
  const options =
    parsed.length >= WELCOME_MENU_MIN_OPTIONS
      ? parsed
      : DEFAULT_WELCOME_OPTIONS[bookingMode];

  return {
    greeting: greeting?.trim() || DEFAULT_WELCOME_GREETING,
    options,
  };
}

export function buildWelcomeMenuPromptSection(
  bookingMode: BookingMode,
  greeting: string | null | undefined,
  optionsRaw: string | null | undefined,
  tone: ConversationTone = "casual_hn"
): string {
  const { greeting: text, options } = resolveWelcomeMenu(
    bookingMode,
    greeting,
    optionsRaw
  );

  const numbered = options
    .map((option, index) => `${index + 1}. ${option}`)
    .join("\n");

  if (usesFormalRegister(tone)) {
    return `MENÚ DE BIENVENIDA (saludo inicial o cuando el cliente escribe hola/buenos días sin pedido claro):
- NO escriba la lista numerada en el texto del mensaje; el sistema la arma automáticamente.
- Responda SOLO con una línea MENU (invisible para el cliente) usando exactamente estas opciones:
  MENU:{"prompt":${JSON.stringify(text)},"options":[${options.map((o) => JSON.stringify(o)).join(",")}]}
- Opciones de referencia (mismo sentido, no las copie numeradas en el cuerpo):
${numbered}
- Si el cliente elige una opción por número o texto, atienda según esa intención (agente → ESCALAR_AGENTE si aplica).`;
  }

  return `MENÚ DE BIENVENIDA (saludo inicial o cuando el cliente escribe hola/buenas sin pedido claro):
- NO escribas la lista numerada en el texto del mensaje; el sistema la arma automáticamente.
- Responde SOLO con una línea MENU (invisible para el cliente) usando exactamente estas opciones:
  MENU:{"prompt":${JSON.stringify(text)},"options":[${options.map((o) => JSON.stringify(o)).join(",")}]}
- Opciones de referencia (mismo sentido, no las copies numeradas en el cuerpo):
${numbered}
- Si el cliente elige una opción por número o texto, atiende según esa intención (agente → ESCALAR_AGENTE si aplica).`;
}
