// Gasan's private posting planner, opened from the signed link sent to his Telegram.

import type { Metadata } from "next";
import Planner from "@/components/Planner";
import LinkRequest from "@/components/LinkRequest";
import { site, verifyPlanner } from "@/lib/sputnik";
import { POSTING, GROUP_SEARCHES } from "@/content/sputnik";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Sputnik planner" }, robots: { index: false, follow: false } };

export default async function Admin({ searchParams }: { searchParams: Promise<{ e?: string; k?: string }> }) {
  const { e, k } = await searchParams;
  if (!verifyPlanner(e, k)) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0b1220] px-4 text-center text-[#eef2f7]">
        <div>
          <h1 className="text-4xl font-extrabold">Planner link needed</h1>
          <p className="mx-auto mt-3 max-w-sm text-[#aab4c3]">
            This link is missing or has expired. Tap below and a fresh one arrives in your Telegram.
          </p>
          <LinkRequest />
        </div>
      </main>
    );
  }
  return <Planner e={e!} k={k!} rules={POSTING} searches={GROUP_SEARCHES} signup={`${site()}/`} />;
}
