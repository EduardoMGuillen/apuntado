import Anthropic from "@anthropic-ai/sdk";
import type { Server } from "socket.io";
import type { WASocket } from "@whiskeysockets/baileys";
import {
  getBusinessContext,
  getMessageHistory,
  saveIncomingMessage,
  saveOutgoingMessage,
  createAppointmentFromBot,
  escalateToAgent,
} from "./db.js";
import { parseReplyMenu, sendReplyWithMenu } from "../lib/message-menu.js";
import { resolveReplyJid } from "../lib/reply-jid.js";
import { stripEscalationKeyword } from "../lib/escalation.js";
import { sendTextMessage } from "../lib/send-message.js";

const DEFAULT_ESCALATION_REPLY =
  "Gracias por escribir. Un agente de nuestro equipo se conectará contigo lo antes posible. 🙏";

const SUBSCRIPTION_INACTIVE_MESSAGE =
  "Hola, en este momento no podemos atender mensajes automáticos. Por favor contactá al negocio directamente o intentá más tarde. 🙏";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

function getAnthropicClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

const TRIVIAL_PATTERNS =
  /^(ok|okay|vale|gracias|thanks|si|sí|no|bueno|listo|perfecto|👍|🙏|😊|✅|👌)[\s!.]*$/i;

const TRIVIAL_REPLIES = [
  "¡De nada! Cualquier cosa me escribís.",
  "¡Listo! Aquí estamos pa' lo que necesités.",
  "¡Perfecto! Nos vemos pronto.",
  "¡Dale! Cualquier duda me avisás.",
  "¡Gracias a vos! Estamos pa' servirte.",
];

const FALLBACK_CUSTOMER_REPLY =
  "Gracias por escribir. Ya recibí tu mensaje, en breve te respondo con la información. 🙌";

const INVALID_REPLY_PATTERNS = [
  /waiting for message/i,
  /this may take a while/i,
  /^thinking\.\.\.?$/i,
];
const INVALID_ESCALATION_PATTERNS = [
  /waiting for message/i,
  /this may take a while/i,
  /esperando este mensaje/i,
];

function randomTrivialReply(): string {
  return TRIVIAL_REPLIES[Math.floor(Math.random() * TRIVIAL_REPLIES.length)];
}

function isTrivialMessage(body: string): boolean {
  return TRIVIAL_PATTERNS.test(body.trim());
}

function sanitizeReply(reply: string): string {
  const clean = reply.trim();
  if (!clean) return FALLBACK_CUSTOMER_REPLY;
  if (INVALID_REPLY_PATTERNS.some((pattern) => pattern.test(clean))) {
    return FALLBACK_CUSTOMER_REPLY;
  }
  return clean;
}

function isInvalidEscalationMessage(text: string): boolean {
  const clean = text.trim();
  if (!clean) return true;
  return INVALID_ESCALATION_PATTERNS.some((pattern) => pattern.test(clean));
}

function resolveEscalationCustomerMessage(
  combinedBody: string,
  history: { body: string; fromClient: boolean }[]
): string {
  if (!isInvalidEscalationMessage(combinedBody)) {
    return combinedBody.trim();
  }

  const fallbackFromHistory = [...history]
    .reverse()
    .find((m) => m.fromClient && !isInvalidEscalationMessage(m.body))?.body;

  if (fallbackFromHistory?.trim()) return fallbackFromHistory.trim();
  return "El cliente solicitó hablar con un agente (sin texto legible).";
}

function inferCustomerNameFromHistory(
  history: { body: string; fromClient: boolean }[]
): string | null {
  const patterns = [
    /me llamo\s+([a-záéíóúñ\s]{2,50})/i,
    /mi nombre (?:es|:)\s+([a-záéíóúñ\s]{2,50})/i,
    /^soy\s+([a-záéíóúñ\s]{2,50})/im,
  ];
  const userTexts = history
    .filter((m) => m.fromClient)
    .map((m) => m.body)
    .reverse();
  for (const text of userTexts) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      const name = match?.[1]?.trim();
      if (name && name.length >= 2) return name;
    }
  }
  return null;
}

function stripConfirmationKeyword(response: string): {
  clean: string;
  confirmed: boolean;
  appointmentData?: {
    serviceName: string;
    scheduledAt: string;
    customerName: string;
    clientType: "empresa" | "particular";
    employeeName?: string;
  };
} {
  if (!response.includes("CITA_CONFIRMADA")) {
    return { clean: response, confirmed: false };
  }

  const lines = response.split("\n");
  let appointmentData:
    | {
        serviceName: string;
        scheduledAt: string;
        customerName?: string;
        clientType?: string;
        employeeName?: string;
      }
    | undefined;

  for (const line of lines) {
    if (line.startsWith("CITA_DATA:")) {
      try {
        appointmentData = JSON.parse(line.replace("CITA_DATA:", ""));
      } catch {
        /* ignore parse errors */
      }
    }
  }

  if (appointmentData) {
    const name = appointmentData.customerName?.trim() ?? "";
    const type = appointmentData.clientType?.trim().toLowerCase();
    if (
      name.length >= 2 &&
      (type === "empresa" || type === "particular") &&
      appointmentData.serviceName &&
      appointmentData.scheduledAt
    ) {
      return {
        clean: response
          .replace(/CITA_CONFIRMADA/g, "")
          .replace(/CITA_DATA:.*\n?/g, "")
          .trim(),
        confirmed: true,
        appointmentData: {
          serviceName: appointmentData.serviceName,
          scheduledAt: appointmentData.scheduledAt,
          customerName: name,
          clientType: type,
          employeeName: appointmentData.employeeName,
        },
      };
    }
    console.warn("[Bot] CITA_DATA incompleta — falta nombre o clientType:", appointmentData);
  }

  const clean = response
    .replace(/CITA_CONFIRMADA/g, "")
    .replace(/CITA_DATA:.*\n?/g, "")
    .trim();

  return { clean, confirmed: false };
}

interface IncomingParams {
  businessId: string;
  customerPhone: string;
  replyJid: string;
  body: string;
  sock: WASocket;
  io: Server;
}

/** Persiste mensaje entrante y notifica al panel (sin generar respuesta del bot). */
export async function notifyIncomingMessage({
  businessId,
  customerPhone,
  replyJid,
  body,
  io,
}: IncomingParams): Promise<void> {
  await saveIncomingMessage(businessId, customerPhone, body, replyJid);

  io.to(`business:${businessId}`).emit("message:new", {
    businessId,
    customerPhone,
    body,
    fromClient: true,
    createdAt: new Date().toISOString(),
  });
}

async function sendBotText(
  params: IncomingParams,
  reply: string,
  menu?: ReturnType<typeof parseReplyMenu>["menu"]
): Promise<void> {
  const outboundJid = resolveReplyJid(params.customerPhone, params.replyJid);
  const sentText = await sendReplyWithMenu(
    params.sock,
    outboundJid,
    reply,
    menu,
    params.customerPhone
  );
  await saveOutgoingMessage(
    params.businessId,
    params.customerPhone,
    sentText,
    outboundJid
  );

  params.io.to(`business:${params.businessId}`).emit("message:new", {
    businessId: params.businessId,
    customerPhone: params.customerPhone,
    body: sentText,
    fromClient: false,
    createdAt: new Date().toISOString(),
  });
}

export interface ProcessBotReplyParams {
  businessId: string;
  customerPhone: string;
  replyJid: string;
  combinedBody: string;
  sock: WASocket;
  io: Server;
}

/** Genera y envía la respuesta del bot (mensajes ya guardados en DB). */
export async function processBotReply(
  params: ProcessBotReplyParams
): Promise<void> {
  const { businessId, customerPhone, replyJid, combinedBody, sock, io } =
    params;

  console.log(
    `[Bot] Procesando respuesta para ${customerPhone} → ${businessId}`
  );

  const sockParams: IncomingParams = {
    businessId,
    customerPhone,
    replyJid,
    body: combinedBody,
    sock,
    io,
  };

  let context;
  try {
    context = await getBusinessContext(businessId, customerPhone);
  } catch (err) {
    console.error("[Bot] Error obteniendo contexto del dashboard:", err);
    await sendBotText(
      sockParams,
      "Disculpá, el asistente no pudo cargar la configuración del negocio. Intentá de nuevo en un momento. 🙏"
    );
    return;
  }

  if (!context.subscriptionActive) {
    console.warn(
      `[Bot] Suscripción inactiva (${context.name} / ${businessId}) — plan no permite bot`
    );
    await sendBotText(sockParams, SUBSCRIPTION_INACTIVE_MESSAGE);
    return;
  }

  if (context.manualTakeover) {
    console.log(`[Bot] Control manual activo para ${customerPhone}`);
    io.to(`business:${businessId}`).emit("takeover:waiting", {
      businessId,
      customerPhone,
    });
    return;
  }

  let reply: string;
  let replyMenu: ReturnType<typeof parseReplyMenu>["menu"] = undefined;

  if (isTrivialMessage(combinedBody)) {
    reply = randomTrivialReply();
  } else {
    const anthropic = getAnthropicClient();
    if (!anthropic) {
      console.error("[Bot] ANTHROPIC_API_KEY no configurada en el VPS");
      reply =
        "Hola, el asistente está en configuración. El negocio te responderá pronto. 🙏";
    } else {
      const history = await getMessageHistory(businessId, customerPhone);

      const messages: Anthropic.MessageParam[] = history.map((m) => ({
        role: m.fromClient ? ("user" as const) : ("assistant" as const),
        content: m.body,
      }));

      if (messages.length === 0) {
        messages.push({ role: "user", content: combinedBody });
      }

      let response;
      try {
        response = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 512,
          system: context.systemPrompt,
          messages,
        });
      } catch (err) {
        console.error("[Bot] Error Anthropic:", err);
        await sendBotText(
          sockParams,
          "Disculpá, tuve un problemita técnico. ¿Podés escribir de nuevo en un momento? 🙏"
        );
        return;
      }

      const textBlock = response.content.find((b) => b.type === "text");
      const rawReply =
        textBlock?.type === "text"
          ? textBlock.text
          : "Disculpá, tuve un problemita. ¿Podés repetir?";

      const { clean, confirmed, appointmentData } =
        stripConfirmationKeyword(rawReply);
      const { clean: afterEscalation, escalate, reason } =
        stripEscalationKeyword(clean);
      const parsedMenu = parseReplyMenu(afterEscalation);
      reply =
        parsedMenu.clean ||
        (escalate ? DEFAULT_ESCALATION_REPLY : afterEscalation);
      replyMenu = parsedMenu.menu;

      if (confirmed && appointmentData) {
        let customerName = appointmentData.customerName.trim();
        if (customerName.length < 2) {
          const inferred = inferCustomerNameFromHistory(history);
          if (inferred) customerName = inferred;
        }
        try {
          await createAppointmentFromBot({
            businessId,
            customerPhone,
            serviceName: appointmentData.serviceName,
            scheduledAt: appointmentData.scheduledAt,
            customerName,
            clientType: appointmentData.clientType,
            employeeName: appointmentData.employeeName,
          });
          io.to(`business:${businessId}`).emit("appointment:new", {
            businessId,
            customerPhone,
            customerName,
            serviceName: appointmentData.serviceName,
            scheduledAt: appointmentData.scheduledAt,
          });
        } catch (err) {
          console.error("[Bot] Error creando cita:", err);
          reply =
            `${reply}\n\n⚠️ No pude registrar la cita en el sistema. El negocio le confirmará por este chat.`.trim();
        }
      } else if (rawReply.includes("CITA_CONFIRMADA")) {
        console.warn(
          "[Bot] CITA_CONFIRMADA sin datos válidos — no se guardó en Citas",
          { customerPhone }
        );
        reply =
          `${reply}\n\n⚠️ La cita quedó pendiente de registro en el sistema. Escriba su nombre completo si no lo indicó.`.trim();
      }

      if (escalate) {
        try {
          const escalation = await escalateToAgent({
            businessId,
            customerPhone,
            customerMessage: resolveEscalationCustomerMessage(
              combinedBody,
              history
            ),
            reason,
          });

          for (const phone of escalation.notifyPhones) {
            const teamJid = phone.replace("+", "") + "@s.whatsapp.net";
            await sendTextMessage(sock, teamJid, escalation.alertMessage);
          }

          io.to(`business:${businessId}`).emit("takeover:waiting", {
            businessId,
            customerPhone,
            escalated: true,
          });
        } catch (err) {
          console.error("[Bot] Error escalando a agente:", err);
        }
      }
    }
  }

  reply = sanitizeReply(reply);
  console.log(`[Bot] Respuesta enviada a ${customerPhone}`);
  await sendBotText(sockParams, reply, replyMenu);
}

/** Sin debounce: guarda y responde al instante (tests o uso directo). */
export async function handleIncomingMessage(
  params: IncomingParams
): Promise<void> {
  await notifyIncomingMessage(params);
  await processBotReply({
    businessId: params.businessId,
    customerPhone: params.customerPhone,
    replyJid: params.replyJid,
    combinedBody: params.body,
    sock: params.sock,
    io: params.io,
  });
}
