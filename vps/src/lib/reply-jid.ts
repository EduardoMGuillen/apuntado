import { isLidUser, jidNormalizedUser } from "@whiskeysockets/baileys";

/** JID de WhatsApp para enviar mensaje al cliente (mismo hilo que el entrante). */
export function resolveReplyJid(
  customerPhone: string,
  replyJid?: string | null
): string {
  if (replyJid?.includes("@")) {
    return jidNormalizedUser(replyJid) || replyJid;
  }

  if (customerPhone.startsWith("lid:")) {
    return `${customerPhone.slice(4)}@lid`;
  }

  const digits = customerPhone.replace(/\D/g, "");
  return digits ? `${digits}@s.whatsapp.net` : "";
}

/** true si el JID guardado es LID (sesión E2E ligada al LID en Baileys). */
export function isLidReplyJid(replyJid?: string | null): boolean {
  return !!replyJid && !!isLidUser(replyJid);
}
