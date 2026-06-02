import {
  isJidUser,
  isLidUser,
  type WASocket,
} from "@whiskeysockets/baileys";
import { resolveReplyJid } from "./reply-jid.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resuelve JID válido en WhatsApp (evita @lid cuando hay teléfono real). */
export async function resolveOutgoingJid(
  sock: WASocket,
  jid: string,
  customerPhone?: string
): Promise<string> {
  const preferred = customerPhone
    ? resolveReplyJid(customerPhone, jid)
    : jid;

  if (!isLidUser(preferred)) {
    try {
      const results = await sock.onWhatsApp(preferred);
      const result = results?.[0];
      if (result?.exists && result.jid && isJidUser(result.jid)) {
        return result.jid;
      }
    } catch (err) {
      console.warn("[WhatsApp] onWhatsApp falló para", preferred, err);
    }
    return preferred;
  }

  if (customerPhone && !customerPhone.startsWith("lid:")) {
    const phoneJid = resolveReplyJid(customerPhone, null);
    console.warn(
      "[WhatsApp] Reemplazando @lid por JID de teléfono:",
      jid,
      "→",
      phoneJid
    );
    return phoneJid;
  }

  try {
    const results = await sock.onWhatsApp(jid);
    const result = results?.[0];
    if (result?.jid && isJidUser(result.jid)) return result.jid;
  } catch (err) {
    console.warn("[WhatsApp] onWhatsApp falló para LID", jid, err);
  }

  return jid;
}

/**
 * Envía texto con pasos que ayudan a evitar "Waiting for this message"
 * (sesión E2E aún no lista en el dispositivo del destinatario).
 */
export async function sendTextMessage(
  sock: WASocket,
  jid: string,
  text: string,
  customerPhone?: string
): Promise<string> {
  const target = await resolveOutgoingJid(sock, jid, customerPhone);

  if (isLidUser(target) && !customerPhone?.startsWith("lid:")) {
    console.error(
      "[WhatsApp] No se envía a @lid sin teléfono real — mensaje omitido:",
      target
    );
    throw new Error("No se pudo resolver JID de teléfono para enviar el mensaje");
  }

  try {
    await sock.presenceSubscribe(target);
    await sock.sendPresenceUpdate("available", target);
  } catch {
    /* no bloquear envío si presence falla */
  }

  await sleep(400);

  try {
    await sock.sendMessage(target, { text });
    return text;
  } catch (firstErr) {
    console.warn("[WhatsApp] Reintento de envío tras fallo E2E:", firstErr);
    await sleep(1200);
    const retriedJid = await resolveOutgoingJid(sock, target, customerPhone);
    await sock.sendMessage(retriedJid, { text });
    return text;
  }
}
