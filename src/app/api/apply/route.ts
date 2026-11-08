// A driver's application from the public sign-up page: saved, then sent to Gasan on Telegram.

import { sql, today, visitorId } from "@/lib/db";
import { telegram } from "@/lib/telegram";
import { ensureTables } from "@/lib/sputnik";

export const runtime = "nodejs";

const LIMITS = { name: 120, phone: 40, email: 200, area: 120, vehicle: 60, licence: 60, years: 40, insurance: 60, experience: 600, start: 80, source: 60 } as const;
type Field = keyof typeof LIMITS;

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export async function POST(request: Request) {
  const db = sql;
  if (!db) return Response.json({ message: "Applications open very soon." }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (text(body.website, 10)) return Response.json({ ok: true }); // bots fill the hidden field

  const a = Object.fromEntries((Object.keys(LIMITS) as Field[]).map((f) => [f, text(body[f], LIMITS[f])])) as Record<Field, string>;
  a.source = a.source.replace(/[^a-z0-9_-]/gi, "");
  const digits = a.phone.replace(/\D/g, "");
  if (!a.name || digits.length < 10 || digits.length > 15) {
    return Response.json({ message: "Please add your name and a phone number we can call." }, { status: 400 });
  }
  if (a.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a.email)) {
    return Response.json({ message: "That email doesn't look right." }, { status: 400 });
  }
  if (body.rtw !== "yes") {
    return Response.json({ message: "You need the right to work in the UK to drive with us." }, { status: 400 });
  }
  if (body.consent !== "yes") {
    return Response.json({ message: "Please tick the box so we can contact you." }, { status: 400 });
  }

  await ensureTables();
  const visitor = visitorId(request);
  const [{ count }] = await db`
    select count(*)::int as count from driver_applications where visitor = ${visitor} and created_at::date = ${today()}`;
  if (Number(count) >= 3) return Response.json({ message: "We already have your application. We'll call you soon." }, { status: 429 });

  await db`
    insert into driver_applications (name, phone, email, area, vehicle, licence, years, insurance, experience, start, source, visitor)
    values (${a.name}, ${a.phone}, ${a.email}, ${a.area}, ${a.vehicle}, ${a.licence}, ${a.years}, ${a.insurance}, ${a.experience}, ${a.start}, ${a.source}, ${visitor})`;

  let from = a.source ? `link ${a.source}` : "direct";
  const m = a.source.match(/^g(\d+)(?:-a(\d+))?$/);
  if (m) {
    const [g] = await db`select name from sputnik_groups where id = ${Number(m[1])}`;
    const [ad] = m[2] ? await db`select title from sputnik_ads where id = ${Number(m[2])}` : [];
    if (g) from = `group "${g.name}"${ad ? `, ad "${ad.title}"` : ""}`;
  }
  // Checked against the job's requirements, so the channel shows at a glance who fits.
  const missing = [
    a.vehicle !== "Yes, my own van" && "no own van",
    (!a.years || a.years === "Under 2 years") && "under 2 years' experience",
    a.insurance !== "I have both" && (a.insurance === "Van insurance only" ? "no GIT insurance" : "no van/GIT insurance"),
    a.licence !== "Yes" && "no full UK licence",
  ].filter(Boolean);
  const lines = [
    missing.length ? `⚠️ NOT A MATCH: ${missing.join(", ")}` : "✅ SUITABLE: meets every requirement",
    "🚐 New Sputnik driver application",
    `${a.name} · ${a.phone}${a.email ? ` · ${a.email}` : ""}`,
    [a.years && `Experience: ${a.years}`, a.vehicle && `Van: ${a.vehicle}`, a.insurance && `Insurance: ${a.insurance}`, a.licence && `UK licence: ${a.licence}`]
      .filter(Boolean)
      .join(" · "),
    [a.area && `Lives: ${a.area}`, a.start && `Start: ${a.start}`]
      .filter(Boolean)
      .join(" · "),
    a.experience ? `Drove for: ${a.experience}` : "",
    `Came from ${from}`,
  ].filter(Boolean);
  const wa = `https://wa.me/${digits.startsWith("0") ? `44${digits.slice(1)}` : digits}`;
  await telegram(lines.join("\n"), [[{ text: "💬 WhatsApp", url: wa }]]);
  return Response.json({ ok: true });
}
