/** JID de WhatsApp para enviar (mismo hilo que el chat entrante). */
export function resolveReplyJid(
  customerPhone: string,
  replyJid?: string | null
): string {
  if (replyJid?.includes("@")) return replyJid;

  if (customerPhone.startsWith("lid:")) {
    return `${customerPhone.slice(4)}@lid`;
  }

  const digits = customerPhone.replace(/\D/g, "");
  return digits ? `${digits}@s.whatsapp.net` : "";
}
