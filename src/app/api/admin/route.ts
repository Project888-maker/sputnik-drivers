// The posting planner's data. Every call carries Gasan's signed link (e, k).
//   POST { e, k, action: "state" }                       everything the planner shows
//   POST { e, k, action: "group.save", group }           add or edit a group
//   POST { e, k, action: "group.delete", id }
//   POST { e, k, action: "ad.save", ad }                 add or edit an ad
//   POST { e, k, action: "ad.delete", id }
//   POST { e, k, action: "ads.starter" }                 add the starter ads
//   POST { e, k, action: "post.log", group_id, ad_id }   "I posted it"
//   POST { e, k, action: "post.undo", id }
//   POST { e, k, action: "applicant.save", id, status, note }
//   POST { e, k, action: "applicant.delete", id }        removes their data for good
//   POST { e, k, action: "reminder.test" }               sends the 7am reminder now

import { sql } from "@/lib/db";
import { ensureTables, verifyPlanner } from "@/lib/sputnik";
import { STARTER_ADS } from "@/content/sputnik";
import { sendReminder } from "@/lib/reminder";

export const runtime = "nodejs";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown) => (Number.isInteger(Number(v)) ? Number(v) : NaN);
const oneOf = <T extends string>(v: unknown, all: readonly T[], fallback: T): T => (all.includes(v as T) ? (v as T) : fallback);

export async function POST(request: Request) {
  const db = sql;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!verifyPlanner(body.e, body.k)) return Response.json({ message: "This link has expired." }, { status: 401 });
  if (!db) return Response.json({ message: "No database configured." }, { status: 503 });
  await ensureTables();

  switch (body.action) {
    case "state": {
      const [groups, ads, posts, applicants] = await Promise.all([
        db`select g.*, (select max(posted_at) from sputnik_posts p where p.group_id = g.id) as last_posted,
             (select ad_id from sputnik_posts p where p.group_id = g.id order by posted_at desc limit 1) as last_ad,
             (select count(*)::int from sputnik_posts p where p.group_id = g.id) as posts,
             (select count(*)::int from driver_applications a where a.source = 'g' || g.id or a.source like 'g' || g.id || '-%') as applicants
           from sputnik_groups g order by g.created_at`,
        db`select a.*, (select count(*)::int from sputnik_posts p where p.ad_id = a.id) as posts,
             (select count(*)::int from driver_applications d where d.source like 'g%-a' || a.id) as applicants
           from sputnik_ads a order by a.id`,
        db`select p.id, p.posted_at, p.group_id, p.ad_id from sputnik_posts p
           where p.posted_at > now() - interval '60 days' order by p.posted_at desc`,
        db`select id, created_at, name, phone, email, area, vehicle, licence, years, insurance, experience, start, source, status, note
           from driver_applications order by created_at desc limit 500`,
      ]);
      return Response.json({ groups, ads, posts, applicants });
    }
    case "group.save": {
      const g = (body.group || {}) as Record<string, unknown>;
      const name = str(g.name, 160);
      const url = str(g.url, 400);
      if (!name) return Response.json({ message: "The group needs a name." }, { status: 400 });
      if (url && !/^https:\/\/(www\.|m\.|web\.)?facebook\.com\//.test(url)) {
        return Response.json({ message: "Paste the group's facebook.com link." }, { status: 400 });
      }
      const members = Number.isFinite(Number(g.members)) && g.members !== "" && g.members !== null ? Math.max(0, Math.round(Number(g.members))) : null;
      const every = Math.min(60, Math.max(1, num(g.every_days) || 7));
      const status = oneOf(g.status, ["to_join", "requested", "joined", "left"] as const, "to_join");
      const ads = oneOf(g.ads, ["yes", "ask", "no"] as const, "yes");
      const area = str(g.area, 80);
      const notes = str(g.notes, 1000);
      const id = num(g.id);
      if (id) {
        await db`update sputnik_groups set name = ${name}, url = ${url}, area = ${area}, members = ${members}, status = ${status},
                 ads = ${ads}, every_days = ${every}, notes = ${notes} where id = ${id}`;
      } else {
        await db`insert into sputnik_groups (name, url, area, members, status, ads, every_days, notes)
                 values (${name}, ${url}, ${area}, ${members}, ${status}, ${ads}, ${every}, ${notes})`;
      }
      return Response.json({ ok: true });
    }
    case "group.delete":
      await db`delete from sputnik_groups where id = ${num(body.id)}`;
      return Response.json({ ok: true });
    case "ad.save": {
      const a = (body.ad || {}) as Record<string, unknown>;
      const title = str(a.title, 120);
      const text = str(a.body, 4000);
      if (!title || text.length < 20) return Response.json({ message: "Give the ad a title and some text." }, { status: 400 });
      const active = a.active !== false;
      const id = num(a.id);
      if (id) await db`update sputnik_ads set title = ${title}, body = ${text}, active = ${active} where id = ${id}`;
      else await db`insert into sputnik_ads (title, body, active) values (${title}, ${text}, ${active})`;
      return Response.json({ ok: true });
    }
    case "ad.delete":
      await db`delete from sputnik_ads where id = ${num(body.id)}`;
      return Response.json({ ok: true });
    case "ads.starter":
      for (const a of STARTER_ADS) await db`insert into sputnik_ads (title, body) values (${a.title}, ${a.body})`;
      return Response.json({ ok: true });
    case "post.log": {
      const groupId = num(body.group_id);
      const adId = num(body.ad_id);
      await db`insert into sputnik_posts (group_id, ad_id) values (${groupId}, ${Number.isNaN(adId) || !adId ? null : adId})`;
      return Response.json({ ok: true });
    }
    case "post.undo":
      await db`delete from sputnik_posts where id = ${num(body.id)}`;
      return Response.json({ ok: true });
    case "applicant.save": {
      const status = oneOf(body.status, ["new", "contacted", "onboarded", "rejected"] as const, "new");
      await db`update driver_applications set status = ${status}, note = ${str(body.note, 1000)} where id = ${str(body.id, 40)}`;
      return Response.json({ ok: true });
    }
    case "applicant.delete":
      await db`delete from driver_applications where id = ${str(body.id, 40)}`;
      return Response.json({ ok: true });
    case "reminder.test": {
      const failed = await sendReminder(true);
      return failed ? Response.json({ message: failed }, { status: 502 }) : Response.json({ ok: true });
    }
    default:
      return Response.json({ message: "Unknown action." }, { status: 400 });
  }
}
