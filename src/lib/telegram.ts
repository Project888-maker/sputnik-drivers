/**
 * A Telegram message. Driver applications go to TELEGRAM_CHAT_ID (your own chat id, or a
 * channel such as "@sputnikdrivers" / "-100…" with the bot as an admin). Private messages,
 * like the planner link, go to TELEGRAM_ADMIN_CHAT_ID when set, so they stay out of a channel.
 * Returns null when sent, or Telegram's reason when it was not.
 */
export async function telegram(
  text: string,
  buttons?: { text: string; url: string }[][],
  to: "channel" | "admin" = "channel",
): Promise<string | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chat = ((to === "admin" && process.env.TELEGRAM_ADMIN_CHAT_ID) || process.env.TELEGRAM_CHAT_ID || "").trim();
  if (!token || !chat) return "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set";
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text,
        disable_web_page_preview: true,
        ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    const body = (await r.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (body.ok) return null;
    const reason = `Telegram ${r.status}: ${body.description || "unknown error"}`;
    console.error("telegram", reason);
    return reason;
  } catch (e) {
    console.error("telegram", e);
    return `Telegram unreachable: ${(e as Error).message}`;
  }
}
