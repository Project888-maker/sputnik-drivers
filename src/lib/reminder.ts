// The morning Telegram reminder: groups due today, new drivers waiting, a fresh planner link.

import { sql } from "@/lib/db";
import { telegram } from "@/lib/telegram";
import { ensureTables, plannerUrl } from "@/lib/sputnik";
import { POSTING } from "@/content/sputnik";

/** Sends the reminder. Returns "nothing" when there is nothing to say, a Telegram error, or null when sent. */
export async function sendReminder(always = false): Promise<string | null> {
  const db = sql;
  if (!db) return "No database.";
  await ensureTables();
  // Same rule as the planner's Today tab.
  const [{ due }] = await db`
    select count(*)::int as due from sputnik_groups g
    where g.status = 'joined' and g.ads <> 'no' and g.url <> ''
      and coalesce((select max(posted_at) from sputnik_posts p where p.group_id = g.id), 'epoch')
          <= now() - make_interval(days => g.every_days) + interval '1 hour'`;
  const [{ fresh }] = await db`select count(*)::int as fresh from driver_applications where status = 'new'`;
  const [{ posted }] = await db`select count(*)::int as posted from sputnik_posts where posted_at > now() - interval '1 day'`;
  if (!due && !fresh && !always) return "nothing";

  const today = Math.min(Number(due), POSTING.maxPerDay);
  const lines = [
    "☀️ Good morning. Sputnik driver hiring for today:",
    due ? `🚐 ${today} group${today === 1 ? "" : "s"} to post in${Number(due) > today ? ` (${due} due, ${POSTING.maxPerDay} a day max)` : ""}` : "🚐 No groups due today",
    fresh ? `👤 ${fresh} new driver${Number(fresh) === 1 ? "" : "s"} waiting for a call` : "",
    posted ? `Last 24 hours: ${posted} post${Number(posted) === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  const link = plannerUrl();
  return telegram(lines.join("\n"), link ? [[{ text: "📋 Open the planner", url: link }]] : undefined, "admin");
}
