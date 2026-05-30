/** JID de WhatsApp para enviar mensaje al cliente. */
export function resolveReplyJid(
  customerPhone: string,
  replyJid?: string | null
): string {
  if (replyJid?.includes("@")) return replyJid;
  if (customerPhone.startsWith("lid:")) {
    return `${customerPhone.slice(4)}@lid`;
  }
  const digits = customerPhone.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}
