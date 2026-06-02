import { extractMessageContent } from "@whiskeysockets/baileys";
import type { WAMessage } from "@whiskeysockets/baileys";

const WA_PLACEHOLDER_PATTERNS = [
  /waiting for message/i,
  /this may take a while/i,
  /esperando este mensaje/i,
];

function sanitizeIncomingText(text: string): string {
  const clean = text.trim();
  if (!clean) return "";
  if (WA_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(clean))) {
    return "";
  }
  return clean;
}

export function isWhatsAppPlaceholderText(text: string): boolean {
  const clean = text.trim();
  if (!clean) return false;
  return WA_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(clean));
}

/** Texto del mensaje entrante (texto, botones, lista, etc.). */
export function getIncomingMessageText(msg: WAMessage): string {
  const content = extractMessageContent(msg.message ?? undefined);
  if (!content) return "";

  if (content.conversation) return sanitizeIncomingText(content.conversation);
  if (content.extendedTextMessage?.text) {
    return sanitizeIncomingText(content.extendedTextMessage.text);
  }

  const buttons = content.buttonsResponseMessage;
  if (buttons?.selectedDisplayText) {
    return sanitizeIncomingText(buttons.selectedDisplayText);
  }
  if (buttons?.selectedButtonId) return sanitizeIncomingText(buttons.selectedButtonId);

  const list = content.listResponseMessage;
  if (list?.title) return sanitizeIncomingText(list.title);
  if (list?.singleSelectReply?.selectedRowId) {
    return sanitizeIncomingText(list.singleSelectReply.selectedRowId);
  }

  const template = content.templateButtonReplyMessage;
  if (template?.selectedDisplayText) {
    return sanitizeIncomingText(template.selectedDisplayText);
  }
  if (template?.selectedId) return sanitizeIncomingText(template.selectedId);

  return "";
}
