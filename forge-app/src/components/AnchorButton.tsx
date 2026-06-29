"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AnchorButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function anchor() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/anchor", { method: "POST" });
    const json = await res.json();
    setMsg(res.ok ? json.data.message : json.error ?? "Anchor failed");
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <button onClick={anchor} disabled={busy} className="btn btn-ember w-full text-sm disabled:opacity-50">
        {busy ? "Anchoring…" : "Anchor pending batch now"}
      </button>
      {msg && <p className="mt-2 text-center text-xs text-[var(--color-fog)]">{msg}</p>}
    </div>
  );
}
