import { extractMessageContent } from "@whiskeysockets/baileys";
import type { WAMessage } from "@whiskeysockets/baileys";

/** Texto del mensaje entrante (texto, botones, lista, etc.). */
export function getIncomingMessageText(msg: WAMessage): string {
  const content = extractMessageContent(msg.message ?? undefined);
  if (!content) return "";

  if (content.conversation) return content.conversation;
  if (content.extendedTextMessage?.text) return content.extendedTextMessage.text;

  const buttons = content.buttonsResponseMessage;
  if (buttons?.selectedDisplayText) return buttons.selectedDisplayText;
  if (buttons?.selectedButtonId) return buttons.selectedButtonId;

  const list = content.listResponseMessage;
  if (list?.title) return list.title;
  if (list?.singleSelectReply?.selectedRowId) {
    return list.singleSelectReply.selectedRowId;
  }

  const template = content.templateButtonReplyMessage;
  if (template?.selectedDisplayText) return template.selectedDisplayText;
  if (template?.selectedId) return template.selectedId;

  return "";
}
