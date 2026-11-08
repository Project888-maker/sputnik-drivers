// The 7am (London) Telegram reminder: how many groups are due and how many new drivers
// are waiting, with a fresh planner link. Vercel Cron calls this at 06:00 and 07:00 UTC;
// only the run that falls in London's 7 o'clock hour sends, so it stays 7am through BST.

import { sql } from "@/lib/db";
import { telegram } from "@/lib/telegram";
import { ensureTables, plannerUrl } from "@/lib/sputnik";
import { POSTING } from "@/content/sputnik";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ message: "Not allowed." }, { status: 401 });
  }
  const db = sql;
  if (!db) return Response.json({ message: "No database." }, { status: 503 });

  const now = new Date();
  const londonHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "numeric", hourCycle: "h23" }).format(now));
  if (londonHour !== 7) return Response.json({ skipped: `London hour is ${londonHour}` });

  await ensureTables();
  await db`create table if not exists sputnik_reminders (day date primary key, sent_at timestamptz not null default now())`;
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(now);
  const claimed = await db`insert into sputnik_reminders (day) values (${day}) on conflict do nothing returning day`;
  if (!claimed.length) return Response.json({ skipped: "already sent today" });

  // Same rule as the planner's Today tab.
  const [{ due }] = await db`
    select count(*)::int as due from sputnik_groups g
    where g.status = 'joined' and g.ads <> 'no' and g.url <> ''
      and coalesce((select max(posted_at) from sputnik_posts p where p.group_id = g.id), 'epoch')
          <= now() - make_interval(days => g.every_days) + interval '1 hour'`;
  const [{ fresh }] = await db`select count(*)::int as fresh from driver_applications where status = 'new'`;
  const [{ posted }] = await db`select count(*)::int as posted from sputnik_posts where posted_at > now() - interval '1 day'`;

  if (!due && !fresh) {
    await db`delete from sputnik_reminders where day = ${day}`;
    return Response.json({ skipped: "nothing to do" });
  }
  const today = Math.min(Number(due), POSTING.maxPerDay);
  const lines = [
    "☀️ Good morning. Sputnik driver hiring for today:",
    due ? `🚐 ${today} group${today === 1 ? "" : "s"} to post in${Number(due) > today ? ` (${due} due, ${POSTING.maxPerDay} a day max)` : ""}` : "🚐 No groups due today",
    fresh ? `👤 ${fresh} new driver${Number(fresh) === 1 ? "" : "s"} waiting for a call` : "",
    posted ? `Yesterday: ${posted} post${Number(posted) === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  const link = plannerUrl();
  const failed = await telegram(lines.join("\n"), link ? [[{ text: "📋 Open the planner", url: link }]] : undefined, "admin");
  if (failed) {
    await db`delete from sputnik_reminders where day = ${day}`;
    return Response.json({ message: failed }, { status: 502 });
  }
  return Response.json({ ok: true, due, fresh });
}
