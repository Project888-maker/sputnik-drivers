/** A message to Gasan on Telegram (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID). */
export async function telegram(text: string, buttons?: { text: string; url: string }[][]) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
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
