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
import { stripEscalationKeyword } from "../lib/escalation.js";

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

function randomTrivialReply(): string {
  return TRIVIAL_REPLIES[Math.floor(Math.random() * TRIVIAL_REPLIES.length)];
}

function isTrivialMessage(body: string): boolean {
  return TRIVIAL_PATTERNS.test(body.trim());
}

function stripConfirmationKeyword(response: string): {
  clean: string;
  confirmed: boolean;
  appointmentData?: {
    serviceName: string;
    scheduledAt: string;
    employeeName?: string;
  };
} {
  if (!response.includes("CITA_CONFIRMADA")) {
    return { clean: response, confirmed: false };
  }

  const lines = response.split("\n");
  let appointmentData: { serviceName: string; scheduledAt: string; employeeName?: string } | undefined;

  for (const line of lines) {
    if (line.startsWith("CITA_DATA:")) {
      try {
        appointmentData = JSON.parse(line.replace("CITA_DATA:", ""));
      } catch {
        /* ignore parse errors */
      }
    }
  }

  const clean = response
    .replace(/CITA_CONFIRMADA/g, "")
    .replace(/CITA_DATA:.*\n?/g, "")
    .trim();

  return { clean, confirmed: true, appointmentData };
}

interface IncomingParams {
  businessId: string;
  customerPhone: string;
  body: string;
  sock: WASocket;
  io: Server;
}

export async function handleIncomingMessage({
  businessId,
  customerPhone,
  body,
  sock,
  io,
}: IncomingParams): Promise<void> {
  await saveIncomingMessage(businessId, customerPhone, body);

  io.to(`business:${businessId}`).emit("message:new", {
    businessId,
    customerPhone,
    body,
    fromClient: true,
    createdAt: new Date().toISOString(),
  });

  const context = await getBusinessContext(businessId, customerPhone);

  if (!context.subscriptionActive) {
    const jid = customerPhone.replace("+", "") + "@s.whatsapp.net";
    await sock.sendMessage(jid, { text: SUBSCRIPTION_INACTIVE_MESSAGE });
    await saveOutgoingMessage(businessId, customerPhone, SUBSCRIPTION_INACTIVE_MESSAGE);
    return;
  }

  if (context.manualTakeover) {
    io.to(`business:${businessId}`).emit("takeover:waiting", {
      businessId,
      customerPhone,
    });
    return;
  }

  let reply: string;
  let replyMenu: ReturnType<typeof parseReplyMenu>["menu"] = undefined;

  if (isTrivialMessage(body)) {
    reply = randomTrivialReply();
  } else {
    const anthropic = getAnthropicClient();
    if (!anthropic) {
      console.error("[Bot] ANTHROPIC_API_KEY no configurada en el VPS");
      reply =
        "Hola, el asistente está en configuración. El negocio te responderá pronto. 🙏";
    } else {
    const history = await getMessageHistory(businessId, customerPhone);

    const messages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({
        role: m.fromClient ? ("user" as const) : ("assistant" as const),
        content: m.body,
      })),
      { role: "user", content: body },
    ];

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: context.systemPrompt,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const rawReply = textBlock?.type === "text" ? textBlock.text : "Disculpá, tuve un problemita. ¿Podés repetir?";

    const { clean, confirmed, appointmentData } = stripConfirmationKeyword(rawReply);
    const { clean: afterEscalation, escalate, reason } =
      stripEscalationKeyword(clean);
    const parsedMenu = parseReplyMenu(afterEscalation);
    reply = parsedMenu.clean || (escalate ? DEFAULT_ESCALATION_REPLY : afterEscalation);
    replyMenu = parsedMenu.menu;

    if (confirmed && appointmentData) {
      try {
        await createAppointmentFromBot({
          businessId,
          customerPhone,
          ...appointmentData,
        });
        io.to(`business:${businessId}`).emit("appointment:new", {
          businessId,
          customerPhone,
          ...appointmentData,
        });
      } catch (err) {
        console.error("[Bot] Error creando cita:", err);
      }
    }

    if (escalate) {
      try {
        const escalation = await escalateToAgent({
          businessId,
          customerPhone,
          customerMessage: body,
          reason,
        });

        for (const phone of escalation.notifyPhones) {
          const teamJid = phone.replace("+", "") + "@s.whatsapp.net";
          await sock.sendMessage(teamJid, { text: escalation.alertMessage });
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

  const jid = customerPhone.replace("+", "") + "@s.whatsapp.net";
  const sentText = await sendReplyWithMenu(sock, jid, reply, replyMenu);
  await saveOutgoingMessage(businessId, customerPhone, sentText);

  io.to(`business:${businessId}`).emit("message:new", {
    businessId,
    customerPhone,
    body: sentText,
    fromClient: false,
    createdAt: new Date().toISOString(),
  });
}
