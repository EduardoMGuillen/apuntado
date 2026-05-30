import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestWaWebVersion,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import type { Server } from "socket.io";
import { handleIncomingMessage } from "./bot-handler.js";
import { saveOutgoingMessage } from "./db.js";
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

function teardownSession(businessId: string): void {
  const session = sessions.get(businessId);
  if (!session) return;

  sessions.delete(businessId);
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
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const version = await resolveWaVersion();

  const sock = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false,
    version,
    browser: Browsers.macOS("Chrome"),
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
    keepAliveIntervalMs: 25_000,
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

      console.log(`[WhatsApp] Sesión conectada: ${businessId}`);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      if (!msg.message) continue;

      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.endsWith("@g.us")) continue;

      const customerPhone = remoteJid.replace("@s.whatsapp.net", "");
      const body =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      if (!body.trim()) continue;

      await handleIncomingMessage({
        businessId,
        customerPhone: `+${customerPhone}`,
        body: body.trim(),
        sock,
        io,
      });
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
  body: string
): Promise<void> {
  const session = sessions.get(businessId);
  if (!session?.connected) {
    throw new Error("Sesión de WhatsApp no conectada");
  }

  const jid = customerPhone.replace("+", "") + "@s.whatsapp.net";
  await session.sock.sendMessage(jid, { text: body });
  await saveOutgoingMessage(businessId, customerPhone, body);
}
