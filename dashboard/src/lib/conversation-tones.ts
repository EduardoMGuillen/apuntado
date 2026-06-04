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
    label: "Casual (recomendado)",
    description:
      'Cercano con "tú", claro y amable. Sin voseo. Ideal para la mayoría de negocios.',
  },
  {
    id: "formal",
    label: "Formal y profesional",
    description:
      "Usted, claro y corporativo. Para clínicas, bufetes y marcas serias.",
  },
  {
    id: "warm",
    label: "Cálido y cercano",
    description: "Amable y empático, sin tanta jerga local.",
  },
  {
    id: "brief",
    label: "Directo y breve",
    description: "Respuestas cortas y profesionales.",
  },
  {
    id: "enthusiastic",
    label: "Entusiasta",
    description: "Energía positiva; emojis con moderación.",
  },
];

export function normalizeConversationTone(
  raw: string | null | undefined
): string | null {
  if (!raw?.trim()) return null;
  return raw.trim().toLowerCase();
}

export function parseConversationTone(
  raw: string | null | undefined
): ConversationTone {
  const normalized = normalizeConversationTone(raw);
  if (
    normalized &&
    CONVERSATION_TONE_VALUES.includes(normalized as ConversationTone)
  ) {
    return normalized as ConversationTone;
  }
  return DEFAULT_CONVERSATION_TONE;
}

/** Tono con registro de usted (sin voseo). */
export function usesFormalRegister(tone: ConversationTone): boolean {
  return tone === "formal" || tone === "brief";
}

export function buildConversationTonePromptSection(
  tone: ConversationTone
): string {
  const config = CONVERSATION_TONES.find((t) => t.id === tone)!;

  const instructions: Record<ConversationTone, string> = {
    formal: `TONO DE CONVERSACIÓN — ${config.label} (PRIORIDAD MÁXIMA):
- Trate SIEMPRE al cliente de "usted". Conjugación formal: puede, confirme, indique, le ayudo, está disponible.
- PROHIBIDO: vos, tú, podés, saludá, decile, agregá, cheque, dale, puras, pa', y jerga local.
- Lenguaje neutro en español internacional; sin regionalismos hondureños ni centroamericanos.
- Profesional, cortés y claro. Esta regla anula cualquier ejemplo en voseo más abajo.`,
    casual_hn: `TONO DE CONVERSACIÓN — ${config.label} (PRIORIDAD MÁXIMA):
- Trate al cliente de "tú". Conjugación con tú: puedes, dime, confirma, te ayudo, está disponible.
- PROHIBIDO voseo: vos, podés, tenés, saludá, decile, agregá, avisá, necesitás, escribís, pa', puras.
- Cercano y claro, sin sonar corporativo ni demasiado frío. Sin jerga pesada.`,
    warm: `TONO DE CONVERSACIÓN — ${config.label}:
- Amable, empático y paciente; preferí "usted" salvo que el cliente use "tú" primero.
- Validá lo que el cliente dice antes de responder (ej. "Entiendo", "Con gusto").
- Evitá respuestas secas o demasiado frías.`,
    brief: `TONO DE CONVERSACIÓN — ${config.label}:
- Mensajes cortos (1–3 oraciones). Trate de "usted".
- Sin rodeos ni jerga local. Mantenga cortesía profesional.`,
    enthusiastic: `TONO DE CONVERSACIÓN — ${config.label}:
- Energía positiva; emojis con moderación (máximo 1 por mensaje).
- Preferir "tú" (puedes, te ayudo). PROHIBIDO voseo (vos, podés, pa', etc.).`,
  };

  return instructions[tone];
}
