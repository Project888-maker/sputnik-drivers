"use client";

// Gasan's daily posting planner for driver groups on Facebook. It never posts anything:
// it picks today's groups, prepares the ad with the group's tracking link, opens the group,
// and Gasan pastes and posts it himself, then taps "I posted it".

import { useCallback, useEffect, useMemo, useState } from "react";

type Group = {
  id: number; name: string; url: string; area: string; members: number | null;
  status: "to_join" | "requested" | "joined" | "left"; ads: "yes" | "ask" | "no";
  every_days: number; notes: string; last_posted: string | null; last_ad: number | null; posts: number; applicants: number;
};
type Ad = { id: number; title: string; body: string; active: boolean; posts: number; applicants: number };
type Post = { id: number; posted_at: string; group_id: number; ad_id: number | null };
type Applicant = {
  id: string; created_at: string; name: string; phone: string; email: string; area: string; vehicle: string; licence: string; years: string; insurance: string;
  experience: string; start: string; source: string; status: "new" | "contacted" | "onboarded" | "rejected"; note: string;
};
type State = { groups: Group[]; ads: Ad[]; posts: Post[]; applicants: Applicant[] };
type Rules = { maxPerDay: number; defaultEveryDays: number; minGapMinutes: number };

const card = "rounded-2xl border border-white/10 bg-[#111a2c] p-4";
const input = "w-full rounded-xl border border-white/12 bg-[#0b1220] px-3 py-2.5 text-sm outline-none focus:border-[#ff8a2a]";
const btn = "rounded-full px-4 py-2 text-sm font-bold transition disabled:opacity-50";
const primary = `${btn} bg-[#ff8a2a] text-[#0b1220]`;
const ghost = `${btn} border border-white/15 text-[#eef2f7]`;
const day = 86_400_000;
const searchUrl = (q: string) => `https://www.facebook.com/search/groups/?q=${encodeURIComponent(q)}`;
const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const ago = (iso: string | null) => {
  if (!iso) return "never";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / day);
  return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
};
const waLink = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/${d.startsWith("0") ? `44${d.slice(1)}` : d}`;
};

export default function Planner({ e, k, rules, searches, signup }: { e: string; k: string; rules: Rules; searches: readonly string[]; signup: string }) {
  const [state, setState] = useState<State | null>(null);
  const [tab, setTab] = useState<"today" | "groups" | "ads" | "drivers">("today");
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  const call = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      setError("");
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e, k, action, ...extra }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.message || "Something went wrong.");
        return null;
      }
      return body;
    },
    [e, k],
  );
  const reload = useCallback(async () => {
    const s = await call("state");
    if (s) setState(s as State);
  }, [call]);
  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    if (await call(action, extra)) await reload();
  };

  useEffect(() => {
    reload();
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [reload]);

  if (!state) return <Shell>{error ? <p className="text-red-300">{error}</p> : <p className="text-[#aab4c3]">Loading…</p>}</Shell>;

  const newDrivers = state.applicants.filter((a) => a.status === "new").length;
  const tabs = [
    ["today", "Today"],
    ["groups", `Groups (${state.groups.length})`],
    ["ads", `Ads (${state.ads.length})`],
    ["drivers", `Drivers${newDrivers ? ` · ${newDrivers} new` : ""}`],
  ] as const;

  return (
    <Shell>
      <nav className="sticky top-0 z-10 -mx-4 mb-6 flex gap-2 overflow-x-auto bg-[#0b1220]/95 px-4 py-3 backdrop-blur">
        {tabs.map(([id, name]) => (
          <button key={id} onClick={() => setTab(id)} className={`${btn} shrink-0 ${tab === id ? "bg-white text-[#0b1220]" : "border border-white/15"}`}>
            {name}
          </button>
        ))}
      </nav>
      {error && <p className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {tab === "today" && <Today state={state} rules={rules} signup={signup} now={now} act={act} />}
      {tab === "groups" && <Groups state={state} rules={rules} searches={searches} act={act} />}
      {tab === "ads" && <Ads state={state} act={act} />}
      {tab === "drivers" && <Drivers state={state} act={act} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0b1220] text-[#eef2f7]">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
        <p className="text-sm font-extrabold tracking-[0.18em]">
          SPUTNIK<span className="text-[#ff8a2a]"> PLANNER</span>
        </p>
        <div className="mt-2">{children}</div>
      </div>
    </main>
  );
}

type Act = (action: string, extra?: Record<string, unknown>) => Promise<void>;

/* ---------------- Today ---------------- */

function Today({ state, rules, signup, now, act }: { state: State; rules: Rules; signup: string; now: number; act: Act }) {
  const [swap, setSwap] = useState<Record<number, number>>({});
  const [copied, setCopied] = useState<number | null>(null);
  const active = state.ads.filter((a) => a.active);
  const postedToday = state.posts.filter((p) => isToday(p.posted_at));
  const left = Math.max(0, rules.maxPerDay - postedToday.length);
  const lastPost = state.posts[0] ? new Date(state.posts[0].posted_at).getTime() : 0;
  const waitMin = Math.max(0, Math.ceil((lastPost + rules.minGapMinutes * 60_000 - now) / 60_000));

  const due = useMemo(
    () =>
      state.groups
        .filter((g) => g.status === "joined" && g.ads !== "no" && g.url)
        .filter((g) => !g.last_posted || now - new Date(g.last_posted).getTime() >= g.every_days * day - 3_600_000)
        .sort((a, b) => (a.last_posted ? new Date(a.last_posted).getTime() : 0) - (b.last_posted ? new Date(b.last_posted).getTime() : 0) || (b.members || 0) - (a.members || 0)),
    [state.groups, now],
  );

  // A different ad from the one last used in this group, favouring the least used.
  const adFor = (g: Group): Ad | undefined => {
    const options = active.filter((a) => a.id !== g.last_ad);
    const pool = (options.length ? options : active).slice().sort((a, b) => a.posts - b.posts || a.id - b.id);
    if (!pool.length) return undefined;
    return pool[(swap[g.id] || 0) % pool.length];
  };
  const textFor = (g: Group, ad: Ad) => ad.body.replaceAll("{link}", `${signup}?src=g${g.id}-a${ad.id}`);

  const copy = async (g: Group, ad: Ad) => {
    await navigator.clipboard.writeText(textFor(g, ad)).catch(() => {});
    setCopied(g.id);
  };

  return (
    <div className="grid gap-4">
      <div className={card}>
        <p className="text-2xl font-extrabold">
          {postedToday.length} of {rules.maxPerDay} posted today
        </p>
        <p className="mt-1 text-sm text-[#aab4c3]">
          {due.length} group{due.length === 1 ? "" : "s"} due.{" "}
          {waitMin > 0 && postedToday.length > 0 ? `Next post in ${waitMin} min. Spacing posts out keeps your account safe.` : "Copy, open the group, paste, post, then tap “I posted it”."}
        </p>
        {!active.length && <p className="mt-3 text-sm text-[#ffb27a]">Add some ads first (Ads tab).</p>}
      </div>

      {left === 0 && <p className={`${card} text-[#aab4c3]`}>That&apos;s today&apos;s limit. The rest wait for tomorrow.</p>}

      {left > 0 &&
        due.slice(0, left).map((g) => {
          const ad = adFor(g);
          return (
            <div key={g.id} className={card}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold">{g.name}</p>
                <p className="text-xs text-[#7f8a9b]">
                  {g.area && `${g.area} · `}
                  {g.members ? `${g.members.toLocaleString()} members · ` : ""}last post {ago(g.last_posted)}
                </p>
              </div>
              {g.ads === "ask" && <p className="mt-2 text-sm text-[#ffb27a]">⚠ This group&apos;s rules limit ads. Check them or ask an admin before posting.</p>}
              {g.notes && <p className="mt-2 text-sm text-[#aab4c3]">📝 {g.notes}</p>}
              {ad && (
                <>
                  <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-[#0b1220] p-3 font-sans text-[0.85rem] leading-relaxed text-[#c7d0dd]">
                    {textFor(g, ad)}
                  </pre>
                  <p className="mt-1 text-xs text-[#7f8a9b]">Ad: {ad.title}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className={primary} onClick={() => copy(g, ad)}>{copied === g.id ? "Copied ✓" : "1. Copy ad"}</button>
                    <a className={ghost} href={g.url} target="_blank" rel="noopener">2. Open group</a>
                    <button className={ghost} disabled={waitMin > 0 && postedToday.length > 0} onClick={() => act("post.log", { group_id: g.id, ad_id: ad.id })}>
                      3. I posted it
                    </button>
                    <button className="px-2 text-sm text-[#7f8a9b] underline" onClick={() => setSwap((s) => ({ ...s, [g.id]: (s[g.id] || 0) + 1 }))}>
                      other ad
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

      {due.length === 0 && (
        <p className={`${card} text-[#aab4c3]`}>
          Nothing due. Join more groups (Groups tab) or wait for the next ones to come round.
        </p>
      )}

      {postedToday.length > 0 && (
        <div className={card}>
          <p className="font-bold">Posted today</p>
          {postedToday.map((p) => (
            <div key={p.id} className="mt-2 flex items-center justify-between gap-3 text-sm text-[#aab4c3]">
              <span>
                {new Date(p.posted_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} ·{" "}
                {state.groups.find((g) => g.id === p.group_id)?.name}
              </span>
              <button className="text-xs underline" onClick={() => act("post.undo", { id: p.id })}>undo</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Groups ---------------- */

const STATUS: Record<Group["status"], string> = { to_join: "To join", requested: "Requested", joined: "Joined", left: "Left" };
const ADS: Record<Group["ads"], string> = { yes: "Ads allowed", ask: "Limited / ask admin", no: "No ads" };

function Groups({ state, rules, searches, act }: { state: State; rules: Rules; searches: readonly string[]; act: Act }) {
  const blank = { id: 0, name: "", url: "", area: "", members: "", status: "joined", ads: "yes", every_days: rules.defaultEveryDays, notes: "" };
  const [form, setForm] = useState<Record<string, string | number>>(blank);
  const [open, setOpen] = useState(false);
  const set = (key: string) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: ev.target.value }));

  const save = async () => {
    await act("group.save", { group: form });
    setForm(blank);
    setOpen(false);
  };

  return (
    <div className="grid gap-4">
      <div className={card}>
        <p className="font-bold">Find groups</p>
        <p className="mt-1 text-sm text-[#aab4c3]">
          These open Facebook&apos;s group search. Join the active ones and read their rules, then add them here. Join a few a day, not dozens at once.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {searches.map((q) => (
            <a key={q} href={searchUrl(q)} target="_blank" rel="noopener" className="rounded-full border border-white/15 px-3 py-1.5 text-xs">
              {q} ↗
            </a>
          ))}
        </div>
      </div>

      {!open && (
        <button className={primary} onClick={() => { setForm(blank); setOpen(true); }}>+ Add a group</button>
      )}
      {open && (
        <div className={`${card} grid gap-3`}>
          <p className="font-bold">{form.id ? "Edit group" : "Add a group"}</p>
          <input className={input} placeholder="Group name" value={form.name} onChange={set("name")} />
          <input className={input} placeholder="https://www.facebook.com/groups/…" value={form.url} onChange={set("url")} />
          <div className="grid grid-cols-2 gap-3">
            <input className={input} placeholder="Area, e.g. East London" value={form.area} onChange={set("area")} />
            <input className={input} placeholder="Members" inputMode="numeric" value={form.members ?? ""} onChange={set("members")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select className={input} value={form.status} onChange={set("status")}>
              {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select className={input} value={form.ads} onChange={set("ads")}>
              {Object.entries(ADS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <label className="text-sm text-[#aab4c3]">
            Post here at most every{" "}
            <input className={`${input} inline-block w-16 text-center`} inputMode="numeric" value={form.every_days} onChange={set("every_days")} /> days
          </label>
          <textarea className={input} rows={2} placeholder="Rules or notes, e.g. job posts only on Mondays" value={form.notes} onChange={set("notes")} />
          <div className="flex gap-2">
            <button className={primary} onClick={save}>Save</button>
            <button className={ghost} onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {state.groups.map((g) => (
        <div key={g.id} className={card}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <a href={g.url} target="_blank" rel="noopener" className="font-bold underline-offset-4 hover:underline">{g.name}</a>
            <p className="text-xs text-[#7f8a9b]">{STATUS[g.status]} · {ADS[g.ads]} · every {g.every_days}d</p>
          </div>
          <p className="mt-1 text-sm text-[#aab4c3]">
            {g.area && `${g.area} · `}{g.members ? `${g.members.toLocaleString()} members · ` : ""}
            {g.posts} post{g.posts === 1 ? "" : "s"}, last {ago(g.last_posted)} · <b className="text-[#eef2f7]">{g.applicants} driver{g.applicants === 1 ? "" : "s"}</b>
          </p>
          {g.notes && <p className="mt-1 text-sm text-[#7f8a9b]">📝 {g.notes}</p>}
          <div className="mt-3 flex gap-3 text-xs">
            <button className="underline" onClick={() => { setForm({ id: g.id, name: g.name, url: g.url, area: g.area, members: g.members ?? "", status: g.status, ads: g.ads, every_days: g.every_days, notes: g.notes }); setOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>edit</button>
            <button className="text-[#7f8a9b] underline" onClick={() => confirm(`Remove ${g.name} and its post history?`) && act("group.delete", { id: g.id })}>remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Ads ---------------- */

function Ads({ state, act }: { state: State; act: Act }) {
  const blank = { id: 0, title: "", body: "", active: true };
  const [form, setForm] = useState<{ id: number; title: string; body: string; active: boolean }>(blank);
  const [open, setOpen] = useState(false);
  const save = async () => {
    await act("ad.save", { ad: form });
    setForm(blank);
    setOpen(false);
  };

  return (
    <div className="grid gap-4">
      <p className="text-sm text-[#aab4c3]">
        Write {"{link}"} where the sign-up link goes; each group gets its own, so you see which group and which ad bring drivers.
        Keep 4+ versions: the planner never posts the same ad twice in a row in one group.
      </p>
      {state.ads.length === 0 && <button className={primary} onClick={() => act("ads.starter")}>Add the 4 starter ads</button>}
      {!open && <button className={ghost} onClick={() => { setForm(blank); setOpen(true); }}>+ Write a new ad</button>}
      {open && (
        <div className={`${card} grid gap-3`}>
          <input className={input} placeholder="Short name, e.g. Weekly pay" value={form.title} onChange={(ev) => setForm({ ...form, title: ev.target.value })} />
          <textarea className={input} rows={9} placeholder={"Ad text… finish with {link}"} value={form.body} onChange={(ev) => setForm({ ...form, body: ev.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(ev) => setForm({ ...form, active: ev.target.checked })} className="accent-[#ff8a2a]" /> In rotation
          </label>
          {!form.body.includes("{link}") && form.body && <p className="text-sm text-[#ffb27a]">Add {"{link}"} so applications are tracked.</p>}
          <div className="flex gap-2">
            <button className={primary} onClick={save}>Save</button>
            <button className={ghost} onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      {state.ads.map((a) => (
        <div key={a.id} className={`${card} ${a.active ? "" : "opacity-60"}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-bold">{a.title}{a.active ? "" : " (paused)"}</p>
            <p className="text-xs text-[#7f8a9b]">{a.posts} posts · <b className="text-[#eef2f7]">{a.applicants} drivers</b></p>
          </div>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#aab4c3]">{a.body}</pre>
          <div className="mt-3 flex gap-3 text-xs">
            <button className="underline" onClick={() => { setForm(a); setOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>edit</button>
            <button className="underline" onClick={() => act("ad.save", { ad: { ...a, active: !a.active } })}>{a.active ? "pause" : "resume"}</button>
            <button className="text-[#7f8a9b] underline" onClick={() => confirm("Delete this ad?") && act("ad.delete", { id: a.id })}>delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Drivers ---------------- */

const STAGES: Applicant["status"][] = ["new", "contacted", "onboarded", "rejected"];

function Drivers({ state, act }: { state: State; act: Act }) {
  const [filter, setFilter] = useState<Applicant["status"] | "all">("all");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const groupName = (src: string) => {
    const m = src.match(/^g(\d+)/);
    return m ? state.groups.find((g) => g.id === Number(m[1]))?.name || "a removed group" : src || "direct";
  };
  const list = state.applicants.filter((a) => filter === "all" || a.status === filter);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {(["all", ...STAGES] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`${btn} ${filter === s ? "bg-white text-[#0b1220]" : "border border-white/15"}`}>
            {s} ({s === "all" ? state.applicants.length : state.applicants.filter((a) => a.status === s).length})
          </button>
        ))}
      </div>
      {list.length === 0 && <p className={`${card} text-[#aab4c3]`}>No drivers here yet.</p>}
      {list.map((a) => (
        <div key={a.id} className={card}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-bold">{a.name}</p>
            <p className="text-xs text-[#7f8a9b]">{new Date(a.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · from {groupName(a.source)}</p>
          </div>
          <p className="mt-1 text-sm text-[#aab4c3]">
            {[a.years && `${a.years} multi-drop`, a.vehicle, a.insurance && `insurance: ${a.insurance}`, a.licence && `UK licence: ${a.licence}`, a.area, a.start].filter(Boolean).join(" · ")}
          </p>
          {a.experience && <p className="mt-1 text-sm text-[#aab4c3]">Drove for: {a.experience}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <a className={primary} href={waLink(a.phone)} target="_blank" rel="noopener">WhatsApp</a>
            <a className={ghost} href={`tel:${a.phone.replace(/[^\d+]/g, "")}`}>Call {a.phone}</a>
            {a.email && <a className={ghost} href={`mailto:${a.email}`}>Email</a>}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
            <select className={input} value={a.status} onChange={(ev) => act("applicant.save", { id: a.id, status: ev.target.value, note: notes[a.id] ?? a.note })}>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input className={input} placeholder="Note" value={notes[a.id] ?? a.note} onChange={(ev) => setNotes({ ...notes, [a.id]: ev.target.value })} />
            <button className={ghost} onClick={() => act("applicant.save", { id: a.id, status: a.status, note: notes[a.id] ?? a.note })}>Save note</button>
          </div>
          <button
            className="mt-3 text-xs text-[#7f8a9b] underline"
            onClick={() => confirm(`Delete ${a.name}'s details for good? Use this when someone asks to be removed.`) && act("applicant.delete", { id: a.id })}
          >
            delete their data
          </button>
        </div>
      ))}
    </div>
  );
}
