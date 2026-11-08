// Public sign-up page for Sputnik Delivery Ltd drivers. Every ad links here with
// ?src=g<group id>, so each application shows which group it came from.

import type { Metadata } from "next";
import DriverForm from "@/components/DriverForm";
import { SPUTNIK } from "@/content/sputnik";

export const metadata: Metadata = {
  title: { absolute: "Drivers wanted · Sputnik Delivery Ltd" },
  description: "Experienced multi-drop driver wanted for fixed routes in NW1 & W2, Central London. £1 per parcel, 150 to 200 a day, 6 days a week. Apply in one minute.",
  openGraph: {
    type: "website",
    siteName: SPUTNIK.company,
    title: "Multi-drop driver wanted: NW1 & W2 · Sputnik Delivery Ltd",
    description: "£1 per parcel, 150 to 200 a day, 6 days a week, fixed routes. Own van needed. Apply in one minute.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "A delivery van on a London street" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.jpg"] },
};

export default async function Sputnik({ searchParams }: { searchParams: Promise<{ src?: string }> }) {
  const { src = "" } = await searchParams;
  const source = src.replace(/[^a-z0-9_-]/gi, "").slice(0, 60);
  return (
    <main className="min-h-screen bg-[#0b1220] text-[#eef2f7]">
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-[position:35%_center] opacity-50"
          style={{ backgroundImage: "url(/hero.jpg)" }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1220]/40 via-[#0b1220]/75 to-[#0b1220]" aria-hidden />
        <header className="relative mx-auto flex max-w-5xl items-center justify-between px-4 pt-6 sm:px-8">
          <p className="text-sm font-extrabold tracking-[0.18em]">
            SPUTNIK<span className="text-[#ff8a2a]"> DELIVERY</span>
          </p>
          <a href="#apply" className="rounded-full bg-[#ff8a2a] px-4 py-2 text-sm font-bold text-[#0b1220]">Apply</a>
        </header>
        <section className="relative mx-auto max-w-5xl px-4 pb-16 pt-16 sm:px-8 sm:pt-24">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ff8a2a]">Now hiring · {SPUTNIK.areas.join(" · ")}</p>
          <h1 className="mt-4 text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl">{SPUTNIK.headline}</h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#c7d0dd]">{SPUTNIK.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#apply" className="rounded-full bg-[#ff8a2a] px-6 py-3.5 font-bold text-[#0b1220] shadow-lg shadow-[#ff8a2a]/20">
              Apply in 1 minute
            </a>
            <a href={SPUTNIK.groupUrl} target="_blank" rel="noopener" className="rounded-full border border-white/20 px-6 py-3.5 font-semibold">
              Join us on Facebook
            </a>
          </div>
        </section>
      </div>

      <section className="mx-auto grid max-w-5xl gap-3 px-4 sm:grid-cols-2 sm:px-8">
        {SPUTNIK.offer.map((o) => (
          <div key={o.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="font-bold">{o.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#aab4c3]">{o.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-4 pt-12 sm:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#ff8a2a]">You&apos;ll need</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {SPUTNIK.requirements.map((r) => (
            <li key={r} className="flex items-center gap-3 text-[#c7d0dd]">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#ff8a2a]/15 text-xs text-[#ff8a2a]">✓</span>
              {r}
            </li>
          ))}
        </ul>
      </section>

      <section id="apply" className="mx-auto max-w-2xl scroll-mt-6 px-4 pb-20 pt-14 sm:px-8">
        <div className="rounded-3xl border border-white/10 bg-[#111a2c] p-5 sm:p-8">
          <h2 className="text-3xl font-extrabold tracking-tight">Apply now</h2>
          <p className="mt-2 text-sm text-[#aab4c3]">One minute. Experienced drivers with their own van only. We call or WhatsApp you within two working days.</p>
          <DriverForm source={source} groupUrl={SPUTNIK.groupUrl} whatsapp={SPUTNIK.whatsapp} />
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs leading-relaxed text-[#7f8a9b]">
        © {new Date().getFullYear()} {SPUTNIK.company}. We use your details only to contact you about driving work and
        delete them on request.
      </footer>
    </main>
  );
}
