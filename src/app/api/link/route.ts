// Sends Gasan a fresh private planner link on Telegram. Safe to leave public: the link
// only ever goes to his chat, and at most once every 10 minutes once one has been sent.

import { sql } from "@/lib/db";
import { telegram } from "@/lib/telegram";
import { ADMIN_DAYS, ensureTables, plannerUrl } from "@/lib/sputnik";

export const runtime = "nodejs";

export async function POST() {
  const db = sql;
  if (!db) return Response.json({ message: "The database isn't connected." }, { status: 503 });
  const link = plannerUrl();
  if (!link) return Response.json({ message: "PLANNER_SECRET isn't set." }, { status: 503 });
  await ensureTables();
  const slot = Math.floor(Date.now() / 600_000);
  const [recent] = await db`select slot from sputnik_link_requests where slot = ${slot}`;
  if (recent) return Response.json({ ok: true, message: "Already sent in the last few minutes. Check Telegram." });
  const failed = await telegram(`📋 Your Sputnik posting planner (valid ${ADMIN_DAYS} days):\n${link}`, undefined, "admin");
  if (failed) return Response.json({ message: failed }, { status: 502 });
  await db`insert into sputnik_link_requests (slot) values (${slot}) on conflict do nothing`;
  return Response.json({ ok: true, message: "Sent. Check Telegram." });
}
