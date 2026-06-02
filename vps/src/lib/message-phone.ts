import {
  isJidBroadcast,
  isJidBot,
  isJidGroup,
  isJidNewsletter,
  isLidUser,
  isPnUser,
  jidNormalizedUser,
} from "@whiskeysockets/baileys";
import type { WAMessage } from "@whiskeysockets/baileys";
import { normalizeWhatsAppPhone } from "./phone.js";

export interface CustomerIdentity {
  /** Clave en DB / API (E.164 o lid:…). */
  customerPhone: string;
  /** JID de WhatsApp para responder (mismo que el chat entrante, p. ej. @lid). */
  replyJid: string;
}

function phoneFromPnJid(jid: string): string | null {
  const normalized = jidNormalizedUser(jid);
  const userPart = normalized?.split("@")[0];
  if (!userPart) return null;
  return normalizeWhatsAppPhone(userPart);
}

export function extractCustomerIdentityFromMessage(
  msg: WAMessage
): CustomerIdentity | null {
  const key = msg.key;
  const remoteJid = key?.remoteJid;
  if (!remoteJid || isJidGroup(remoteJid)) return null;

  if (isJidBroadcast(remoteJid) || isJidNewsletter(remoteJid) || isJidBot(remoteJid)) {
    return null;
  }

  if (!isPnUser(remoteJid) && !isLidUser(remoteJid)) return null;

  let customerPhone: string | null = null;

  const pnAlt = key.remoteJidAlt;
  if (pnAlt && isPnUser(pnAlt)) {
    customerPhone = phoneFromPnJid(pnAlt);
  }

  if (!customerPhone && isPnUser(remoteJid)) {
    customerPhone = phoneFromPnJid(remoteJid);
  }

  if (!customerPhone && isLidUser(remoteJid)) {
    const lidUser = remoteJid.split("@")[0] ?? "unknown";
    customerPhone = `lid:${lidUser}`;
  }

  if (!customerPhone) {
    console.warn("[WhatsApp] Sin identificador de cliente:", {
      remoteJid,
      remoteJidAlt: pnAlt,
    });
    return null;
  }

  const replyJid = jidNormalizedUser(remoteJid) || remoteJid;

  return { customerPhone, replyJid };
}
