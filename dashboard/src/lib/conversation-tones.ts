export const CONVERSATION_TONE_VALUES = [
  "casual_hn",
  "formal",
  "warm",
  "brief",
  "enthusiastic",
] as const;

export type ConversationTone = (typeof CONVERSATION_TONE_VALUES)[number];

export const DEFAULT_CONVERSATION_TONE: ConversationTone = "casual_hn";

export const CONVERSATION_TONES: {
  id: ConversationTone;
  label: string;
  description: string;
}[] = [
  {
    id: "casual_hn",
    label: "Casual hondureño",
    description: 'Natural, con "vos", "cheque" y "pa\'". Ideal para la mayoría de negocios.',
  },
  {
    id: "formal",
    label: "Formal",
    description: "Usted, respetuoso y profesional. Clínicas, bufetes, servicios premium.",
  },
  {
    id: "warm",
    label: "Cálido y cercano",
    description: "Amable y empático, sin tanta jerga local. Bueno para salud y bienestar.",
  },
  {
    id: "brief",
    label: "Directo y breve",
    description: "Respuestas cortas, al grano. Ideal cuando hay mucho volumen de chats.",
  },
  {
    id: "enthusiastic",
    label: "Entusiasta",
    description: "Energía positiva y motivadora. Restaurantes, retail, promociones.",
  },
];

export function parseConversationTone(
  raw: string | null | undefined
): ConversationTone {
  if (
    raw &&
    CONVERSATION_TONE_VALUES.includes(raw as ConversationTone)
  ) {
    return raw as ConversationTone;
  }
  return DEFAULT_CONVERSATION_TONE;
}

export function buildConversationTonePromptSection(
  tone: ConversationTone
): string {
  const config = CONVERSATION_TONES.find((t) => t.id === tone)!;

  const instructions: Record<ConversationTone, string> = {
    casual_hn: `TONO DE CONVERSACIÓN — ${config.label}:
- Español hondureño casual: "vos", "cheque", "pa'", "dale", "puras".
- Cercano pero profesional; como un empleado amable del negocio.
- Evitá sonar robótico o demasiado formal.`,
    formal: `TONO DE CONVERSACIÓN — ${config.label}:
- Tratá al cliente de "usted"; sin jerga local ni diminutivos excesivos.
- Frases claras, corteses y profesionales.
- Mantené calidez sin informalidad.`,
    warm: `TONO DE CONVERSACIÓN — ${config.label}:
- Amable, empático y paciente; podés usar "vos" con moderación.
- Validá lo que el cliente dice antes de responder (ej. "Entiendo", "Con gusto").
- Evitá respuestas secas o demasiado frías.`,
    brief: `TONO DE CONVERSACIÓN — ${config.label}:
- Mensajes cortos (1–3 oraciones cuando sea posible).
- Sin rodeos ni repetir lo que el cliente ya dijo.
- Seguí siendo amable; no suenes brusco.`,
    enthusiastic: `TONO DE CONVERSACIÓN — ${config.label}:
- Energía positiva; podés usar emojis con moderación (1 por mensaje como máximo).
- Entusiasmo genuino por ayudar y por el negocio.
- Evitá exagerar o parecer vendedor agresivo.`,
  };

  return instructions[tone];
}
