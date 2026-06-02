import {
  isJidBroadcast,
  isJidBot,
  isJidGroup,
  isJidNewsletter,
  isJidUser,
  isLidUser,
  jidNormalizedUser,
} from "@whiskeysockets/baileys";
import type { WAMessage } from "@whiskeysockets/baileys";
import { normalizeWhatsAppPhone } from "./phone.js";

export interface CustomerIdentity {
  /** Clave en DB / API (E.164 o lid:…). */
  customerPhone: string;
  /** JID de WhatsApp para responder (p. ej. @lid o @s.whatsapp.net). */
  replyJid: string;
}

export function extractCustomerIdentityFromMessage(
  msg: WAMessage
): CustomerIdentity | null {
  const key = msg.key;
  const remoteJid = key?.remoteJid;
  if (!remoteJid || isJidGroup(remoteJid)) return null;

  // Estados (status@broadcast), listas de difusión, canales — no son chats 1:1.
  if (isJidBroadcast(remoteJid) || isJidNewsletter(remoteJid) || isJidBot(remoteJid)) {
    return null;
  }

  if (!isJidUser(remoteJid) && !isLidUser(remoteJid)) return null;

  let customerPhone: string | null = null;

  if (key.senderPn) {
    const raw = key.senderPn.split("@")[0] ?? key.senderPn;
    customerPhone = normalizeWhatsAppPhone(raw);
  }

  if (!customerPhone) {
    if (isLidUser(remoteJid)) {
      const lidUser = remoteJid.split("@")[0] ?? "unknown";
      customerPhone = `lid:${lidUser}`;
    } else {
      const normalized = jidNormalizedUser(remoteJid);
      const userPart = normalized?.replace("@s.whatsapp.net", "");
      if (userPart) {
        customerPhone = normalizeWhatsAppPhone(userPart);
      }
    }
  }

  if (!customerPhone) {
    console.warn("[WhatsApp] Sin identificador de cliente:", {
      remoteJid,
      senderPn: key.senderPn,
    });
    return null;
  }

  let replyJid = remoteJid;
  const senderPn = key.senderPn;
  if (senderPn && isJidUser(senderPn)) {
    replyJid = jidNormalizedUser(senderPn) || senderPn;
  } else if (isJidUser(remoteJid)) {
    replyJid = jidNormalizedUser(remoteJid) || remoteJid;
  }

  if (isLidUser(replyJid) && !customerPhone.startsWith("lid:")) {
    const digits = customerPhone.replace(/\D/g, "");
    if (digits) replyJid = `${digits}@s.whatsapp.net`;
  }

  return { customerPhone, replyJid };
}
