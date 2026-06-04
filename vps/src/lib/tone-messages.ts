export type ConversationTone =
  | "formal"
  | "casual_hn"
  | "warm"
  | "brief"
  | "enthusiastic";

const TONES: ConversationTone[] = [
  "formal",
  "casual_hn",
  "warm",
  "brief",
  "enthusiastic",
];

export function parseConversationTone(
  raw?: string | null
): ConversationTone {
  const n = raw?.trim().toLowerCase();
  if (n && TONES.includes(n as ConversationTone)) {
    return n as ConversationTone;
  }
  return "casual_hn";
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

/** Registro tú (sin voseo). */
function isTuRegister(tone: ConversationTone): boolean {
  return tone === "casual_hn" || tone === "enthusiastic";
}

const TRIVIAL_FORMAL = [
  "De nada. Quedo atento si necesita algo más.",
  "Perfecto. Gracias por escribir.",
  "Entendido. Con gusto le atendemos.",
  "Gracias a usted. Estamos para ayudarle.",
];

const TRIVIAL_CASUAL = [
  "¡De nada! Cualquier cosa, escríbeme.",
  "¡Listo! Aquí estamos para lo que necesites.",
  "¡Perfecto! Nos vemos pronto.",
  "¡Gracias! Con gusto te ayudamos.",
];

const TRIVIAL_WARM = [
  "Con gusto. Si necesita algo más, escríbanos.",
  "Perfecto, gracias por escribir.",
  "De nada. Aquí estamos para ayudarle.",
];

const TRIVIAL_BRIEF = [
  "De nada.",
  "Perfecto. Quedo atento.",
  "Entendido. Gracias.",
];

const TRIVIAL_ENTHUSIASTIC = [
  "¡Con gusto! Si necesitas algo más, aquí estamos.",
  "¡Perfecto! Gracias por escribir.",
  "¡De nada! Estamos para ayudarte.",
];

export function pickTrivialReply(tone: ConversationTone): string {
  switch (tone) {
    case "casual_hn":
      return pick(TRIVIAL_CASUAL);
    case "warm":
      return pick(TRIVIAL_WARM);
    case "brief":
      return pick(TRIVIAL_BRIEF);
    case "enthusiastic":
      return pick(TRIVIAL_ENTHUSIASTIC);
    default:
      return pick(TRIVIAL_FORMAL);
  }
}

export function getFallbackCustomerReply(tone: ConversationTone): string {
  if (isTuRegister(tone)) {
    return "Gracias por escribir. Ya recibí tu mensaje; en breve te respondo con la información.";
  }
  return "Gracias por escribir. Recibí su mensaje; en breve le respondo con la información.";
}

export function getConfigLoadErrorReply(tone: ConversationTone): string {
  if (isTuRegister(tone)) {
    return "Disculpa, el asistente no pudo cargar la configuración. Intenta de nuevo en un momento.";
  }
  return "Disculpe, el asistente no pudo cargar la configuración. Intente de nuevo en un momento.";
}

export function getAnthropicErrorReply(tone: ConversationTone): string {
  if (isTuRegister(tone)) {
    return "Disculpa, tuve un problema técnico. ¿Puedes escribir de nuevo en un momento?";
  }
  return "Disculpe, hubo un problema técnico. ¿Puede escribir de nuevo en un momento?";
}

export function getAnthropicEmptyReply(tone: ConversationTone): string {
  if (isTuRegister(tone)) {
    return "Disculpa, no pude procesar tu mensaje. ¿Puedes repetirlo?";
  }
  return "Disculpe, no pude procesar su mensaje. ¿Puede repetirlo?";
}

export function getEscalationReply(tone: ConversationTone): string {
  if (isTuRegister(tone)) {
    return "Gracias por escribir. Un agente del equipo se conectará contigo lo antes posible.";
  }
  return "Gracias por escribir. Un agente de nuestro equipo se conectará con usted lo antes posible.";
}

export function getSubscriptionInactiveReply(tone: ConversationTone): string {
  if (isTuRegister(tone)) {
    return "Hola, en este momento no podemos atender mensajes automáticos. Contacta al negocio directamente o intenta más tarde.";
  }
  return "Hola, en este momento no podemos atender mensajes automáticos. Contacte al negocio directamente o intente más tarde.";
}

export function pickMenuConnector(tone: ConversationTone): string {
  if (isTuRegister(tone)) {
    return pick([
      "¿Cuál te interesa? Puedes escribir:",
      "Elige una de estas opciones:",
      "¿Qué te agendo?",
      "Estas son las opciones:",
    ]);
  }
  return pick([
    "¿Cuál le interesa? Puede escribir:",
    "Indique una de estas opciones:",
    "¿Cuál prefiere?",
    "Estas son las opciones disponibles:",
  ]);
}
