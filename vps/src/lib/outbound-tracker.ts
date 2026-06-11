/** Mensajes enviados por nuestra app (bot, panel, recordatorios) — no son "desde el celular". */
export type AppOutboundSource = "bot" | "agent" | "system";

type Entry = { source: AppOutboundSource; expiresAt: number };

const TTL_MS = 3 * 60 * 1000;
const recent = new Map<string, Entry>();

function trackerKey(businessId: string, messageId: string): string {
  return `${businessId}:${messageId}`;
}

export function registerAppOutbound(
  businessId: string,
  messageId: string | undefined | null,
  source: AppOutboundSource
): void {
  if (!messageId) return;
  recent.set(trackerKey(businessId, messageId), {
    source,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function getAppOutbound(
  businessId: string,
  messageId: string | undefined | null
): AppOutboundSource | null {
  if (!messageId) return null;
  const key = trackerKey(businessId, messageId);
  const entry = recent.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    recent.delete(key);
    return null;
  }
  return entry.source;
}
