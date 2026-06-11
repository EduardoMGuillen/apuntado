import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestWaWebVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import type { Server } from "socket.io";
import { extractCustomerIdentityFromMessage } from "../lib/message-phone.js";
import {
  getIncomingMessageText,
  isWhatsAppPlaceholderText,
} from "../lib/message-body.js";
import { resolveReplyJid } from "../lib/reply-jid.js";
import { sendTextMessage } from "../lib/send-message.js";
import {
  dropSessionMessageStore,
  getSessionMessageStore,
} from "../lib/message-store.js";
import { cleanEncryptionSessionFiles } from "../lib/signal-session-clean.js";
import { enqueueIncomingMessage } from "./message-buffer.js";
import {
  activateManualTakeover,
  saveOutgoingMessage,
  setSessionConnected,
} from "./db.js";
import { getAppOutbound } from "../lib/outbound-tracker.js";
import type { AppOutboundSource } from "../lib/outbound-tracker.js";
import path from "path";
import fs from "fs";
import pino from "pino";

const logger = pino({ level: "silent" });

interface SessionState {
  sock: WASocket;
  connected: boolean;
  qr?: string;
}

const sessions = new Map<string, SessionState>();
const AUTH_DIR =
  process.env.AUTH_SESSIONS_DIR ||
  path.join(process.cwd(), "auth_sessions");
const PLACEHOLDER_NOTICE_COOLDOWN_MS = 60_000;
const placeholderNoticeAt = new Map<string, number>();

/** WhatsApp rechaza conexiones con versión de protocolo vieja (error 405). */
const FALLBACK_WA_VERSION: [number, number, number] = [2, 3000, 1034074495];

let cachedWaVersion: [number, number, number] | undefined;

const FATAL_DISCONNECT_CODES = new Set<number>([
  DisconnectReason.loggedOut,
  DisconnectReason.forbidden,
  DisconnectReason.multideviceMismatch,
  DisconnectReason.badSession,
  DisconnectReason.connectionReplaced,
  405,
  403,
  401,
]);

async function resolveWaVersion(): Promise<[number, number, number]> {
  if (cachedWaVersion) return cachedWaVersion;

  try {
    const { version, isLatest } = await fetchLatestWaWebVersion({});
    cachedWaVersion = version as [number, number, number];
    console.log(
      `[WhatsApp] Versión WA: ${cachedWaVersion.join(".")} (latest=${isLatest})`
    );
    return cachedWaVersion;
  } catch (error) {
    console.warn("[WhatsApp] No se pudo obtener versión WA, usando fallback", error);
    cachedWaVersion = FALLBACK_WA_VERSION;
    return cachedWaVersion;
  }
}

function ensureAuthDir(): void {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
}

export function getSession(businessId: string): SessionState | undefined {
  return sessions.get(businessId);
}

export function getQrCode(businessId: string): string | undefined {
  return sessions.get(businessId)?.qr;
}

/** Hay credenciales guardadas en el volumen (reconectar sin QR). */
export function hasPersistedAuth(businessId: string): boolean {
  const authPath = path.join(AUTH_DIR, businessId);
  if (!fs.existsSync(authPath)) return false;
  return fs.existsSync(path.join(authPath, "creds.json"));
}

function teardownSession(businessId: string): void {
  const session = sessions.get(businessId);
  if (!session) return;

  sessions.delete(businessId);
  dropSessionMessageStore(businessId);
  try {
    session.sock.end(
      new Boom("session restart", { statusCode: DisconnectReason.loggedOut })
    );
  } catch {
    /* ignore */
  }
}

export function waitForQr(
  businessId: string,
  timeoutMs = 25_000,
  intervalMs = 400
): Promise<string | undefined> {
  return new Promise((resolve) => {
    const started = Date.now();

    const tick = () => {
      const qr = getQrCode(businessId);
      if (qr) {
        resolve(qr);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(undefined);
        return;
      }
      setTimeout(tick, intervalMs);
    };

    tick();
  });
}

function clearAuthFiles(businessId: string): void {
  const authPath = path.join(AUTH_DIR, businessId);
  if (fs.existsSync(authPath)) {
    fs.rmSync(authPath, { recursive: true, force: true });
  }
}

export async function startSession(
  businessId: string,
  io: Server,
  options?: { forceQr?: boolean }
): Promise<void> {
  const existing = sessions.get(businessId);
  if (existing?.connected) return;

  if (existing) {
    teardownSession(businessId);
  }

  if (options?.forceQr) {
    clearAuthFiles(businessId);
  }

  ensureAuthDir();
  const authPath = path.join(AUTH_DIR, businessId);

  const versionMarker = path.join(authPath, ".baileys-version");
  if (hasPersistedAuth(businessId)) {
    try {
      const prev = fs.existsSync(versionMarker)
        ? fs.readFileSync(versionMarker, "utf8").trim()
        : "";
      if (prev !== "7") {
        const removed = cleanEncryptionSessionFiles(authPath);
        fs.writeFileSync(versionMarker, "7");
        console.log(
          `[WhatsApp] Migración Baileys 7: ${removed} archivo(s) E2E limpiados (${businessId})`
        );
      }
    } catch (err) {
      console.warn(`[WhatsApp] No se pudo migrar claves E2E (${businessId}):`, err);
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const version = await resolveWaVersion();

  const messageStore = getSessionMessageStore(businessId);

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal: false,
    version,
    browser: Browsers.macOS("Chrome"),
    markOnlineOnConnect: true,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
    keepAliveIntervalMs: 25_000,
    getMessage: (key) => messageStore.get(key),
  });

  sessions.set(businessId, { sock, connected: false });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const session = sessions.get(businessId)!;
      session.qr = qr;
      console.log(`[WhatsApp] QR generado: ${businessId}`);
      qrcode.generate(qr, { small: true });
      io.to(`business:${businessId}`).emit("whatsapp:qr", { businessId, qr });
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const isFatal =
        statusCode !== undefined && FATAL_DISCONNECT_CODES.has(statusCode);

      console.log(
        `[WhatsApp] Conexión cerrada: ${businessId} code=${statusCode ?? "unknown"} fatal=${isFatal}`
      );

      const session = sessions.get(businessId);
      if (session) {
        session.connected = false;
        session.qr = undefined;
      }

      io.to(`business:${businessId}`).emit("whatsapp:status", {
        businessId,
        connected: false,
      });

      void setSessionConnected(businessId, false).catch((err) =>
        console.error("[WhatsApp] No se pudo actualizar DB (desconectado):", err)
      );

      if (isFatal) {
        teardownSession(businessId);
        if (statusCode === 405 || statusCode === DisconnectReason.forbidden) {
          clearAuthFiles(businessId);
        }
        return;
      }

      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut &&
        statusCode !== DisconnectReason.connectionReplaced;

      if (shouldReconnect) {
        setTimeout(() => startSession(businessId, io, { forceQr: false }), 5000);
      } else {
        sessions.delete(businessId);
      }
    } else if (connection === "open") {
      const session = sessions.get(businessId)!;
      session.connected = true;
      session.qr = undefined;

      io.to(`business:${businessId}`).emit("whatsapp:status", {
        businessId,
        connected: true,
      });

      void setSessionConnected(businessId, true).catch((err) =>
        console.error("[WhatsApp] No se pudo actualizar DB (conectado):", err)
      );

      console.log(`[WhatsApp] Sesión conectada: ${businessId}`);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    for (const msg of messages) {
      if (msg.key.id && msg.message) {
        messageStore.set(msg.key.id, msg.message);
      }
    }

    if (type !== "notify") return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (!msg.message) continue;

      const identity = extractCustomerIdentityFromMessage(msg);
      if (!identity) {
        console.warn(`[WhatsApp] Mensaje sin identidad (${businessId})`, {
          remoteJid: msg.key.remoteJid,
        });
        continue;
      }

      const body = getIncomingMessageText(msg).trim();
      if (!body) {
        const rawConversation = msg.message?.conversation ?? "";
        const rawExtended = msg.message?.extendedTextMessage?.text ?? "";
        const maybePlaceholder = isWhatsAppPlaceholderText(rawConversation)
          || isWhatsAppPlaceholderText(rawExtended);

        if (maybePlaceholder) {
          const dedupeKey = `${businessId}:${identity.customerPhone}`;
          const now = Date.now();
          const lastNotice = placeholderNoticeAt.get(dedupeKey) ?? 0;
          if (now - lastNotice >= PLACEHOLDER_NOTICE_COOLDOWN_MS) {
            const fallbackText =
              "No pude leer tu último mensaje completo. ¿Puedes reenviarlo en texto, por favor?";
            try {
              const outboundJid = resolveReplyJid(
                identity.customerPhone,
                identity.replyJid
              );
              await sendTextMessage(
                sock,
                outboundJid,
                fallbackText,
                identity.customerPhone,
                { businessId, source: "bot" }
              );
              await saveOutgoingMessage(
                businessId,
                identity.customerPhone,
                fallbackText,
                outboundJid
              );
              placeholderNoticeAt.set(dedupeKey, now);
              io.to(`business:${businessId}`).emit("message:new", {
                businessId,
                customerPhone: identity.customerPhone,
                body: fallbackText,
                fromClient: false,
                createdAt: new Date().toISOString(),
              });
            } catch (err) {
              console.error(
                `[WhatsApp] Error enviando fallback por placeholder (${identity.customerPhone}):`,
                err
              );
            }
          }
        }

        console.log(
          `[WhatsApp] Mensaje sin texto (${identity.customerPhone}) — tipo multimedia u omitido`
        );
        continue;
      }

      try {
        enqueueIncomingMessage({
          businessId,
          customerPhone: identity.customerPhone,
          replyJid: identity.replyJid,
          body,
          sock,
          io,
        });
      } catch (err) {
        console.error(
          `[WhatsApp] Error encolando mensaje (${identity.customerPhone}):`,
          err
        );
      }
    }

    for (const msg of messages) {
      if (!msg.key.fromMe || !msg.message) continue;

      const identity = extractCustomerIdentityFromMessage(msg);
      if (!identity) continue;

      const appSource = getAppOutbound(businessId, msg.key.id);
      if (appSource === "bot" || appSource === "system") continue;

      const body = getIncomingMessageText(msg).trim();
      if (!body) continue;

      const createdAt = new Date().toISOString();

      try {
        if (appSource !== "agent") {
          await saveOutgoingMessage(
            businessId,
            identity.customerPhone,
            body,
            identity.replyJid
          );
        }

        await activateManualTakeover(
          businessId,
          identity.customerPhone,
          identity.replyJid
        );

        io.to(`business:${businessId}`).emit("message:new", {
          businessId,
          customerPhone: identity.customerPhone,
          body,
          fromClient: false,
          createdAt,
        });

        io.to(`business:${businessId}`).emit("takeover:active", {
          businessId,
          customerPhone: identity.customerPhone,
          body,
          createdAt,
        });

        console.log(
          `[WhatsApp] Mensaje humano (${appSource ?? "phone"}) → control manual: ${identity.customerPhone}`
        );
      } catch (err) {
        console.error(
          `[WhatsApp] Error registrando saliente humano (${identity.customerPhone}):`,
          err
        );
      }
    }
  });
}

export async function stopSession(businessId: string): Promise<void> {
  const session = sessions.get(businessId);
  if (!session) return;

  await session.sock.logout();
  sessions.delete(businessId);

  const authPath = path.join(AUTH_DIR, businessId);
  if (fs.existsSync(authPath)) {
    fs.rmSync(authPath, { recursive: true, force: true });
  }
}

export async function sendMessage(
  businessId: string,
  customerPhone: string,
  body: string,
  replyJid?: string,
  options?: { source?: AppOutboundSource }
): Promise<void> {
  const session = sessions.get(businessId);
  if (!session?.connected) {
    throw new Error("Sesión de WhatsApp no conectada");
  }

  const source = options?.source ?? "agent";
  const jid = resolveReplyJid(customerPhone, replyJid);
  await sendTextMessage(session.sock, jid, body, customerPhone, {
    businessId,
    source,
  });
  await saveOutgoingMessage(businessId, customerPhone, body, jid);
}

/** Tras reinicio del VPS, reconectar sesiones guardadas en el volumen. */
export async function restorePersistedSessions(io: Server): Promise<void> {
  ensureAuthDir();

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(AUTH_DIR, { withFileTypes: true });
  } catch {
    return;
  }

  const businessIds = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  if (businessIds.length === 0) return;

  console.log(`[WhatsApp] Restaurando ${businessIds.length} sesión(es) guardada(s)…`);

  for (let i = 0; i < businessIds.length; i++) {
    const businessId = businessIds[i]!;
    if (!hasPersistedAuth(businessId)) continue;

    try {
      await startSession(businessId, io, { forceQr: false });
    } catch (err) {
      console.error(`[WhatsApp] Error restaurando ${businessId}:`, err);
    }

    if (i < businessIds.length - 1) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}
