// Sputnik Delivery Ltd: driver applications and the group posting planner.
// Tables are created on first use, so no manual migration is needed.

import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";

const secret = () => process.env.PLANNER_SECRET || "";
export const site = () => (process.env.SITE_URL || "https://sputnik-drivers.vercel.app").replace(/\/$/, "");

export const ADMIN_DAYS = 90;

/** Gasan's private link to the planner (valid 90 days), sent to his Telegram. */
export function plannerUrl(days = ADMIN_DAYS): string | null {
  if (!secret()) return null;
  const expires = Date.now() + days * 86_400_000;
  const sig = createHmac("sha256", secret()).update(`sputnik|${expires}`).digest("base64url");
  return `${site()}/admin?e=${expires}&k=${sig}`;
}

export function verifyPlanner(expires: unknown, key: unknown): boolean {
  if (!secret() || typeof expires !== "string" || typeof key !== "string" || Number(expires) < Date.now()) return false;
  const expected = Buffer.from(createHmac("sha256", secret()).update(`sputnik|${expires}`).digest("base64url"));
  const given = Buffer.from(key);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

let ready: Promise<void> | null = null;

export function ensureTables(): Promise<void> {
  const db = sql;
  if (!db) return Promise.resolve();
  ready ??= (async () => {
    await db`create table if not exists sputnik_groups (
      id serial primary key,
      created_at timestamptz not null default now(),
      name text not null,
      url text not null default '',
      area text not null default '',
      members integer,
      status text not null default 'to_join' check (status in ('to_join', 'requested', 'joined', 'left')),
      ads text not null default 'yes' check (ads in ('yes', 'ask', 'no')),
      every_days integer not null default 7,
      notes text not null default ''
    )`;
    await db`create table if not exists sputnik_ads (
      id serial primary key,
      created_at timestamptz not null default now(),
      title text not null,
      body text not null,
      active boolean not null default true
    )`;
    await db`create table if not exists sputnik_posts (
      id serial primary key,
      posted_at timestamptz not null default now(),
      group_id integer not null references sputnik_groups(id) on delete cascade,
      ad_id integer references sputnik_ads(id) on delete set null
    )`;
    await db`create table if not exists driver_applications (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      name text not null,
      phone text not null,
      email text not null default '',
      area text not null default '',
      vehicle text not null default '',
      licence text not null default '',
      experience text not null default '',
      start text not null default '',
      source text not null default '',
      visitor text not null,
      years text not null default '',
      insurance text not null default '',
      status text not null default 'new' check (status in ('new', 'contacted', 'onboarded', 'rejected')),
      note text not null default ''
    )`;
    await db`create table if not exists sputnik_link_requests (slot bigint primary key, created_at timestamptz not null default now())`;
    await db`create index if not exists driver_applications_visitor on driver_applications (visitor, created_at)`;

  })().catch((e) => {
    ready = null;
    throw e;
  });
  return ready;
}
