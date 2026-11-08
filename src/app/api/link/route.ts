// Sends Gasan a fresh private planner link on his own Telegram. Safe to leave public:
// the link only ever goes to his chat, and at most once every 10 minutes.

import { sql } from "@/lib/db";
import { telegram } from "@/lib/telegram";
import { ADMIN_DAYS, ensureTables, plannerUrl } from "@/lib/sputnik";

export const runtime = "nodejs";

export async function POST() {
  const db = sql;
  const link = plannerUrl();
  if (!db || !link) return Response.json({ message: "Not configured yet." }, { status: 503 });
  await ensureTables();
  const slot = Math.floor(Date.now() / 600_000);
  const rows = await db`insert into sputnik_link_requests (slot) values (${slot}) on conflict do nothing returning slot`;
  if (rows.length) await telegram(`📋 Your Sputnik posting planner (valid ${ADMIN_DAYS} days):\n${link}`, undefined, "admin");
  return Response.json({ ok: true });
}
