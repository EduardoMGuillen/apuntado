import type { WASocket } from "@whiskeysockets/baileys";

export interface ReplyMenu {
  prompt?: string;
  options: string[];
}

const MENU_LINE = /MENU:\s*(\{[\s\S]*?\})\s*(?:\n|$)/;

const MENU_CONNECTORS = [
  "¿Cuál te interesa? Podés escribir:",
  "Tocá o respondeme con una de estas:",
  "¿Qué te agendo?",
  "Cheque, estas son las opciones:",
  "¿Cuál te funciona mejor?",
  "Elegí la que te cuadre:",
];

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

function buildTextMenu(body: string, menu: ReplyMenu): string {
  const intro = body.trim() || menu.prompt?.trim() || "";
  const connector =
    MENU_CONNECTORS[Math.floor(Math.random() * MENU_CONNECTORS.length)];
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
  menu: ReplyMenu | undefined
): Promise<string> {
  const text = menu?.options.length ? buildTextMenu(body, menu) : body;
  await sock.sendMessage(jid, { text });
  return text;
}
