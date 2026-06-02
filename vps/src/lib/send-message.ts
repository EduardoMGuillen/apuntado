import type { WASocket } from "@whiskeysockets/baileys";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resuelve JID válido en WhatsApp (incluye mapeo LID cuando aplica). */
export async function resolveOutgoingJid(
  sock: WASocket,
  jid: string
): Promise<string> {
  try {
    const results = await sock.onWhatsApp(jid);
    const result = results?.[0];
    if (result?.exists && result.jid) return result.jid;
  } catch (err) {
    console.warn("[WhatsApp] onWhatsApp falló para", jid, err);
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
  text: string
): Promise<string> {
  const target = await resolveOutgoingJid(sock, jid);

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
    const retriedJid = await resolveOutgoingJid(sock, target);
    await sock.sendMessage(retriedJid, { text });
    return text;
  }
}
