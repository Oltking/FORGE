"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AttestPanel({ recordId }: { recordId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [stake, setStake] = useState("0.01");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/records/${recordId}/attest`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note, stake_hac: Number(stake) || 0.01 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Attestation failed");
      setDone(true);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card p-5">
        <p className="font-semibold text-[var(--color-green)]">✓ Attested</p>
        <p className="mt-1 text-sm text-[var(--color-fog)]">
          Your co-signature is recorded. Both stakes are on HACD. Neither of you can edit this
          record.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-white">Co-sign this record</h3>
      <p className="mt-1 text-sm text-[var(--color-fog)]">
        Attesting stakes HAC on-chain — the mutual stake. You and the worker both put real cost
        behind this record.
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <label className="label">Your note</label>
          <textarea
            className="input"
            rows={3}
            placeholder="e.g. Delivered on time and exceeded scope on gas optimization."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Stake (HAC)</label>
          <input className="input mono w-32" value={stake} onChange={(e) => setStake(e.target.value)} />
        </div>
        {error && <p className="text-sm text-[var(--color-red,#f87171)]" style={{ color: "#f87171" }}>{error}</p>}
        <button onClick={submit} disabled={busy} className="btn btn-ember disabled:opacity-50">
          {busy ? "Attesting…" : "Attest & co-sign"}
        </button>
      </div>
    </div>
  );
}
