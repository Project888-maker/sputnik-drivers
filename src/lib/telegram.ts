/**
 * A Telegram message. Driver applications go to TELEGRAM_CHAT_ID (a channel such as
 * "@sputnikdrivers" or "-100…", with the bot as an admin). Private messages, like the
 * planner link, go to TELEGRAM_ADMIN_CHAT_ID when set, so they stay out of the channel.
 */
export async function telegram(text: string, buttons?: { text: string; url: string }[][], to: "channel" | "admin" = "channel") {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = (to === "admin" && process.env.TELEGRAM_ADMIN_CHAT_ID) || process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chat,
      text,
      disable_web_page_preview: true,
      ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  }).catch((e) => console.error("telegram", e));
}
