// The 7am (London) Telegram reminder: how many groups are due and how many new drivers
// are waiting, with a fresh planner link. Vercel Cron calls this at 06:00 and 07:00 UTC;
// only the run that falls in London's 7 o'clock hour sends, so it stays 7am through BST.

import { sql } from "@/lib/db";
import { ensureTables } from "@/lib/sputnik";
import { sendReminder } from "@/lib/reminder";

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

  const result = await sendReminder();
  if (result) await db`delete from sputnik_reminders where day = ${day}`;
  if (result && result !== "nothing") return Response.json({ message: result }, { status: 502 });
  return Response.json({ ok: true, result: result || "sent" });
}
