import type { Server } from "socket.io";
import type { WASocket } from "@whiskeysockets/baileys";
import {
  notifyIncomingMessage,
  processBotReply,
} from "./bot-handler.js";

const DEBOUNCE_MS = Number(process.env.MESSAGE_DEBOUNCE_MS) || 20_000;

interface BufferEntry {
  businessId: string;
  customerPhone: string;
  replyJid: string;
  bodies: string[];
  sock: WASocket;
  io: Server;
  timer: ReturnType<typeof setTimeout>;
}

const buffers = new Map<string, BufferEntry>();

function bufferKey(businessId: string, customerPhone: string): string {
  return `${businessId}:${customerPhone}`;
}

export interface EnqueueParams {
  businessId: string;
  customerPhone: string;
  replyJid: string;
  body: string;
  sock: WASocket;
  io: Server;
}

/** Guarda el mensaje al instante y agrupa respuestas del bot tras ~20s sin nuevos mensajes. */
export function enqueueIncomingMessage(params: EnqueueParams): void {
  const key = bufferKey(params.businessId, params.customerPhone);

  void notifyIncomingMessage(params).catch((err) => {
    console.error(`[Buffer] Error guardando mensaje (${key}):`, err);
  });

  const existing = buffers.get(key);
  if (existing) {
    existing.bodies.push(params.body);
    existing.replyJid = params.replyJid;
    existing.sock = params.sock;
    existing.io = params.io;
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => void flushBuffer(key), DEBOUNCE_MS);
    console.log(
      `[Buffer] +1 mensaje (${existing.bodies.length} en cola) ${key} — espera ${DEBOUNCE_MS / 1000}s`
    );
    return;
  }

  const entry: BufferEntry = {
    businessId: params.businessId,
    customerPhone: params.customerPhone,
    replyJid: params.replyJid,
    bodies: [params.body],
    sock: params.sock,
    io: params.io,
    timer: setTimeout(() => void flushBuffer(key), DEBOUNCE_MS),
  };

  buffers.set(key, entry);
  console.log(`[Buffer] Nuevo lote ${key} — respuesta en ${DEBOUNCE_MS / 1000}s`);
}

async function flushBuffer(key: string): Promise<void> {
  const entry = buffers.get(key);
  if (!entry) return;

  buffers.delete(key);

  const combinedBody = entry.bodies.join("\n").trim();
  if (!combinedBody) return;

  console.log(
    `[Buffer] Procesando ${entry.bodies.length} mensaje(s) → ${key}`
  );

  try {
    await processBotReply({
      businessId: entry.businessId,
      customerPhone: entry.customerPhone,
      replyJid: entry.replyJid,
      combinedBody,
      sock: entry.sock,
      io: entry.io,
    });
  } catch (err) {
    console.error(`[Buffer] Error procesando respuesta (${key}):`, err);
  }
}
