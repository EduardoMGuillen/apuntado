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
  return "formal";
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

const TRIVIAL_FORMAL = [
  "De nada. Quedo atento si necesita algo más.",
  "Perfecto. Gracias por escribir.",
  "Entendido. Con gusto le atendemos.",
  "Gracias a usted. Estamos para ayudarle.",
];

const TRIVIAL_CASUAL = [
  "¡De nada! Cualquier cosa me escribís.",
  "¡Listo! Aquí estamos para lo que necesités.",
  "¡Perfecto! Nos vemos pronto.",
  "¡Dale! Cualquier duda me avisás.",
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
  "¡Con gusto! Si necesita algo más, aquí estamos.",
  "¡Perfecto! Gracias por escribir.",
  "¡De nada! Estamos para ayudarle.",
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
  if (tone === "casual_hn") {
    return "Gracias por escribir. Ya recibí tu mensaje; en breve te respondo con la información.";
  }
  return "Gracias por escribir. Recibí su mensaje; en breve le respondo con la información.";
}

export function getConfigLoadErrorReply(tone: ConversationTone): string {
  if (tone === "casual_hn") {
    return "Disculpá, el asistente no pudo cargar la configuración. Intentá de nuevo en un momento.";
  }
  return "Disculpe, el asistente no pudo cargar la configuración. Intente de nuevo en un momento.";
}

export function getAnthropicErrorReply(tone: ConversationTone): string {
  if (tone === "casual_hn") {
    return "Disculpá, tuve un problema técnico. ¿Podés escribir de nuevo en un momento?";
  }
  return "Disculpe, hubo un problema técnico. ¿Puede escribir de nuevo en un momento?";
}

export function getAnthropicEmptyReply(tone: ConversationTone): string {
  if (tone === "casual_hn") {
    return "Disculpá, tuve un problemita. ¿Podés repetir?";
  }
  return "Disculpe, no pude procesar su mensaje. ¿Puede repetirlo?";
}

export function getEscalationReply(tone: ConversationTone): string {
  if (tone === "casual_hn") {
    return "Gracias por escribir. Un agente del equipo se conectará con vos lo antes posible.";
  }
  return "Gracias por escribir. Un agente de nuestro equipo se conectará con usted lo antes posible.";
}

export function getSubscriptionInactiveReply(tone: ConversationTone): string {
  if (tone === "casual_hn") {
    return "Hola, en este momento no podemos atender mensajes automáticos. Contactá al negocio directamente o intentá más tarde.";
  }
  return "Hola, en este momento no podemos atender mensajes automáticos. Contacte al negocio directamente o intente más tarde.";
}

export function pickMenuConnector(tone: ConversationTone): string {
  if (tone === "casual_hn") {
    return pick([
      "¿Cuál te interesa? Podés escribir:",
      "Tocá o respondeme con una de estas:",
      "¿Qué te agendo?",
      "Cheque, estas son las opciones:",
    ]);
  }
  return pick([
    "¿Cuál le interesa? Puede escribir:",
    "Indique una de estas opciones:",
    "¿Cuál prefiere?",
    "Estas son las opciones disponibles:",
  ]);
}
