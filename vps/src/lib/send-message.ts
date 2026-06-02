import {
  isLidUser,
  isPnUser,
  jidNormalizedUser,
  type WASocket,
} from "@whiskeysockets/baileys";
import { resolveReplyJid } from "./reply-jid.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resuelve JID de envío (Baileys 7 mapea LID/PN internamente). */
export async function resolveOutgoingJid(
  sock: WASocket,
  jid: string,
  customerPhone?: string
): Promise<string> {
  const preferred = jidNormalizedUser(
    customerPhone ? resolveReplyJid(customerPhone, jid) : jid
  ) || jid;

  try {
    const results = await sock.onWhatsApp(preferred);
    const result = results?.[0];
    if (result?.exists && result.jid) {
      return jidNormalizedUser(result.jid) || result.jid;
    }
  } catch (err) {
    console.warn("[WhatsApp] onWhatsApp falló para", preferred, err);
  }

  return preferred;
}

/**
 * Envía texto; usa assertSessions y el JID del hilo (incl. @lid) para E2E en iOS.
 */
export async function sendTextMessage(
  sock: WASocket,
  jid: string,
  text: string,
  customerPhone?: string
): Promise<string> {
  const target = await resolveOutgoingJid(sock, jid, customerPhone);

  console.log("[WhatsApp] Enviando mensaje", {
    target,
    lid: isLidUser(target),
    pn: isPnUser(target),
    customerPhone: customerPhone ?? null,
  });

  try {
    await sock.assertSessions([target], true);
  } catch (err) {
    console.warn("[WhatsApp] assertSessions:", err);
  }

  try {
    await sock.presenceSubscribe(target);
    await sock.sendPresenceUpdate("available", target);
  } catch {
    /* no bloquear envío si presence falla */
  }

  await sleep(500);

  try {
    await sock.sendMessage(target, { text });
    return text;
  } catch (firstErr) {
    console.warn("[WhatsApp] Reintento de envío tras fallo E2E:", firstErr);
    await sleep(1500);
    try {
      await sock.assertSessions([target], true);
    } catch {
      /* ignore */
    }
    const retriedJid = await resolveOutgoingJid(sock, target, customerPhone);
    await sock.sendMessage(retriedJid, { text });
    return text;
  }
}
