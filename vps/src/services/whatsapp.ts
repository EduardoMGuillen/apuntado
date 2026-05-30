import makeWASocket, {
  DisconnectReason,
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
const AUTH_DIR = path.join(process.cwd(), "auth_sessions");

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

export async function startSession(
  businessId: string,
  io: Server
): Promise<void> {
  if (sessions.has(businessId)) {
    const existing = sessions.get(businessId)!;
    if (existing.connected) return;
  }

  ensureAuthDir();
  const authPath = path.join(AUTH_DIR, businessId);
  const { state, saveCreds } = await useMultiFileAuthState(authPath);

  const sock = makeWASocket({
    auth: state,
    logger,
    printQRInTerminal: false,
  });

  sessions.set(businessId, { sock, connected: false });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const session = sessions.get(businessId)!;
      session.qr = qr;
      qrcode.generate(qr, { small: true });
      io.to(`business:${businessId}`).emit("whatsapp:qr", { businessId, qr });
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      const session = sessions.get(businessId);
      if (session) {
        session.connected = false;
        session.qr = undefined;
      }

      io.to(`business:${businessId}`).emit("whatsapp:status", {
        businessId,
        connected: false,
      });

      if (shouldReconnect) {
        setTimeout(() => startSession(businessId, io), 3000);
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
