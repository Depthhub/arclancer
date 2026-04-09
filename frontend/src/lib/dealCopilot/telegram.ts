import type { BotReply } from "@/lib/dealCopilot/types";

type TelegramInlineKeyboardButton = {
  text: string;
  url?: string;
  callback_data?: string;
};

type TelegramSendMessagePayload = {
  chat_id: string;
  text: string;
  disable_web_page_preview: boolean;
  parse_mode?: "Markdown" | "HTML";
  reply_markup?: { inline_keyboard: TelegramInlineKeyboardButton[][] };
};

type TelegramSendMessageOpts = {
  token: string;
  chatId: string;
  reply: BotReply;
};

/**
 * Escape characters that break Telegram Markdown v1 parsing.
 * Use this on any user-provided content (URLs, addresses, etc.)
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*`\[])/g, "\\$1");
}

export async function telegramSendMessage(opts: TelegramSendMessageOpts): Promise<void> {
  const { token, chatId, reply } = opts;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const MAX_LEN = 4000; // Telegram limit is 4096
  const chunks: string[] = [];
  let remaining = reply.text;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_LEN) {
      chunks.push(remaining);
      break;
    }
    
    // Try to find a good breaking point (newline)
    let breakPoint = remaining.lastIndexOf("\n", MAX_LEN);
    if (breakPoint === -1 || breakPoint < MAX_LEN - 1000) {
      breakPoint = MAX_LEN; // Hard split if no good newline
    }
    
    chunks.push(remaining.slice(0, breakPoint));
    remaining = remaining.slice(breakPoint).trimStart();
  }

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const isLast = i === chunks.length - 1;
    
    const payload: TelegramSendMessagePayload = {
      chat_id: chatId,
      text: chunk,
      disable_web_page_preview: true,
    };

    if (reply.parseMode) payload.parse_mode = reply.parseMode;

    if (isLast && reply.buttons && reply.buttons.length > 0) {
      payload.reply_markup = {
        inline_keyboard: reply.buttons.map((row) =>
          row.map((b) => {
            const btn: TelegramInlineKeyboardButton = { text: b.text };
            if (b.url) btn.url = b.url;
            if (b.callback_data) btn.callback_data = b.callback_data;
            return btn;
          })
        ),
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");

      // If Markdown parsing failed, retry WITHOUT parseMode
      if (res.status === 400 && body.includes("can't parse entities") && payload.parse_mode) {
        console.warn("[telegram] Markdown parse failed for chunk, retrying without parse_mode");
        const fallbackPayload = { ...payload };
        delete fallbackPayload.parse_mode;
        // Strip markdown formatting from text for readability
        fallbackPayload.text = chunk
          .replace(/\*\*/g, "")    // remove **bold**
          .replace(/\*/g, "")      // remove *italic*
          .replace(/`/g, "");      // remove `code`

        const retryRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fallbackPayload),
        });

        if (!retryRes.ok) {
          const retryBody = await retryRes.text().catch(() => "");
          throw new Error(`Telegram sendMessage retry failed: ${retryRes.status} ${retryBody}`);
        }
        continue;
      }

      throw new Error(`Telegram sendMessage failed: ${res.status} ${body}`);
    }
  }
}

/**
 * Answer a callback query (acknowledges the inline button press).
 * If `text` is provided it shows a brief notification to the user.
 */
export async function telegramAnswerCallbackQuery(opts: {
  token: string;
  callbackQueryId: string;
  text?: string;
}): Promise<void> {
  const url = `https://api.telegram.org/bot${opts.token}/answerCallbackQuery`;
  const payload: Record<string, string | boolean> = {
    callback_query_id: opts.callbackQueryId,
  };
  if (opts.text) payload.text = opts.text;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`answerCallbackQuery failed: ${res.status} ${body}`);
  }
}
