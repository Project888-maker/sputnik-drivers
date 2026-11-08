"use client";

import { useState } from "react";

export default function LinkRequest() {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [message, setMessage] = useState("");

  async function send() {
    setState("sending");
    const r = await fetch("/api/link", { method: "POST" }).catch(() => null);
    const body = r ? await r.json().catch(() => ({})) : {};
    setMessage(body.message || (r?.ok ? "Sent. Check Telegram." : "Something went wrong."));
    setState(r?.ok ? "done" : "idle");
  }

  return (
    <div className="mt-6">
      <button
        disabled={state !== "idle"}
        onClick={send}
        className="rounded-full bg-[#ff8a2a] px-6 py-3 font-bold text-[#0b1220] disabled:opacity-70"
      >
        {state === "sending" ? "Sending…" : state === "done" ? "Sent" : "Send me a fresh link"}
      </button>
      {message && <p className={`mx-auto mt-4 max-w-sm text-sm ${state === "done" ? "text-[#aab4c3]" : "text-red-300"}`}>{message}</p>}
    </div>
  );
}
