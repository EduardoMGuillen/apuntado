import type { WASocket } from "@whiskeysockets/baileys";
import { resolveReplyJid } from "./reply-jid.js";
import { sendTextMessage, type SendTextTrack } from "./send-message.js";
import {
  parseConversationTone,
  pickMenuConnector,
  type ConversationTone,
} from "./tone-messages.js";

export interface ReplyMenu {
  prompt?: string;
  options: string[];
}

const MENU_LINE = /MENU:\s*(\{[\s\S]*?\})\s*(?:\n|$)/;

export function parseReplyMenu(response: string): {
  clean: string;
  menu?: ReplyMenu;
} {
  const match = response.match(MENU_LINE);
  if (!match) {
    return { clean: response.trim() };
  }

  try {
    const menu = JSON.parse(match[1]) as ReplyMenu;
    const clean = response.replace(MENU_LINE, "").trim();
    const options = menu.options?.filter(Boolean) ?? [];

    if (options.length < 2 || options.length > 6) {
      return { clean: response.replace(MENU_LINE, "").trim() };
    }

    return { clean, menu: { prompt: menu.prompt, options } };
  } catch {
    return { clean: response.replace(MENU_LINE, "").trim() };
  }
}

/** Evita duplicar 1. 2. 3. si el modelo ya los incluyó en el texto. */
function bodyAlreadyShowsMenu(body: string, options: string[]): boolean {
  const text = body.trim();
  if (!text) return false;

  const hasNumberedList =
    /(?:^|\n)\s*1\.\s+\S/.test(text) && /(?:^|\n)\s*2\.\s+\S/.test(text);
  if (!hasNumberedList) return false;

  const matched = options.filter((opt) => {
    const snippet = opt.trim().slice(0, 12);
    if (snippet.length < 4) return false;
    return text.toLowerCase().includes(snippet.toLowerCase());
  });

  return matched.length >= Math.min(2, options.length);
}

function buildTextMenu(
  body: string,
  menu: ReplyMenu,
  tone: ConversationTone
): string {
  const intro = body.trim() || menu.prompt?.trim() || "";
  const connector = pickMenuConnector(tone);
  const options = menu.options
    .map((option, index) => `${index + 1}. ${option}`)
    .join("\n");

  if (intro) {
    return `${intro}\n\n${connector}\n${options}`;
  }

  return `${connector}\n${options}`;
}

export async function sendReplyWithMenu(
  sock: WASocket,
  jid: string,
  body: string,
  menu: ReplyMenu | undefined,
  customerPhone?: string,
  conversationTone?: string | null,
  track?: SendTextTrack
): Promise<string> {
  const tone = parseConversationTone(conversationTone);
  let text: string;
  if (menu?.options.length) {
    text = bodyAlreadyShowsMenu(body, menu.options)
      ? body.trim()
      : buildTextMenu(body, menu, tone);
  } else {
    text = body;
  }
  const targetJid = customerPhone
    ? resolveReplyJid(customerPhone, jid)
    : jid;
  await sendTextMessage(sock, targetJid, text, customerPhone, track);
  return text;
}
