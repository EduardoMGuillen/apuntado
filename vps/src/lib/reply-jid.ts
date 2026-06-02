import { isLidUser } from "@whiskeysockets/baileys";

/** JID de WhatsApp para enviar mensaje al cliente. */
export function resolveReplyJid(
  customerPhone: string,
  replyJid?: string | null
): string {
  if (customerPhone.startsWith("lid:")) {
    if (replyJid && !isLidUser(replyJid)) return replyJid;
    return `${customerPhone.slice(4)}@lid`;
  }

  const digits = customerPhone.replace(/\D/g, "");
  const phoneJid = digits ? `${digits}@s.whatsapp.net` : "";

  // Enviar a @lid provoca "Waiting for this message" en el móvil del cliente.
  if (phoneJid && (!replyJid || isLidUser(replyJid))) return phoneJid;

  if (replyJid?.includes("@")) return replyJid;
  return phoneJid;
}
