import {
  isJidGroup,
  isJidUser,
  isLidUser,
  jidNormalizedUser,
} from "@whiskeysockets/baileys";
import type { WAMessage } from "@whiskeysockets/baileys";
import { isHondurasMobile, normalizeWhatsAppPhone } from "./phone.js";

export function extractCustomerPhoneFromMessage(
  msg: WAMessage
): string | null {
  const key = msg.key;
  if (!key) return null;

  if (key.senderPn) {
    const raw = key.senderPn.split("@")[0] ?? key.senderPn;
    const normalized = normalizeWhatsAppPhone(raw);
    if (isHondurasMobile(normalized)) return normalized;
  }

  const remoteJid = key.remoteJid;
  if (!remoteJid || isJidGroup(remoteJid)) return null;

  if (isLidUser(remoteJid) && !key.senderPn) {
    console.warn(
      "[WhatsApp] Mensaje con @lid sin senderPn — no se pudo obtener teléfono"
    );
    return null;
  }

  const normalizedJid = jidNormalizedUser(remoteJid);
  if (!normalizedJid || !isJidUser(normalizedJid)) return null;

  const userPart = normalizedJid.replace("@s.whatsapp.net", "");
  return normalizeWhatsAppPhone(userPart);
}
