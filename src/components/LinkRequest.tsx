"use client";

import { useState } from "react";

export default function LinkRequest() {
  const [sent, setSent] = useState(false);
  return (
    <button
      disabled={sent}
      onClick={() => fetch("/api/link", { method: "POST" }).finally(() => setSent(true))}
      className="mt-6 rounded-full bg-[#ff8a2a] px-6 py-3 font-bold text-[#0b1220] disabled:opacity-70"
    >
      {sent ? "Sent. Check Telegram." : "Send me a fresh link"}
    </button>
  );
}
