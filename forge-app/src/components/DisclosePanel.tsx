"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { makeOpenings, type SealedProof } from "@/lib/forge/proof-client";

interface Keystore {
  root: string;
  fields: SealedProof["fields"];
}

export function DisclosePanel({
  proofId,
  proofRoot,
  sealedKeys,
  disclosedKeys,
}: {
  proofId: string;
  proofRoot: string;
  sealedKeys: string[];
  disclosedKeys: string[];
}) {
  const router = useRouter();
  const [keystore, setKeystore] = useState<Keystore | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const undisclosed = sealedKeys.filter((k) => !disclosedKeys.includes(k));

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (json.root !== proofRoot) {
        throw new Error("This keystore doesn't match this proof's root.");
      }
      if (!Array.isArray(json.fields)) throw new Error("Invalid keystore file.");
      setKeystore({ root: json.root, fields: json.fields });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function toggle(key: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function disclose() {
    if (!keystore || selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const sealed: SealedProof = { root: keystore.root, fields: keystore.fields };
      const openings = await makeOpenings(sealed, [...selected]);
      const res = await fetch(`/api/proofs/${proofId}/disclose`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ openings }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Disclosure failed");
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (undisclosed.length === 0) {
    return (
      <div className="card p-5 text-sm text-[var(--color-fog)]">
        All fields disclosed. This proof is fully revealed.
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-white">Reveal details</h3>
      <p className="mt-1 text-sm text-[var(--color-fog)]">
        Load the key file you saved when you sealed this, then pick which details to reveal. The rest
        stay private.
      </p>

      {!keystore ? (
        <label className="btn btn-ghost mt-4 inline-flex cursor-pointer text-sm">
          Load key file
          <input type="file" accept="application/json" className="hidden" onChange={onFile} />
        </label>
      ) : (
        <>
          <div className="mt-4 space-y-1.5">
            {undisclosed.map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm text-[var(--color-mist)]">
                <input type="checkbox" checked={selected.has(k)} onChange={() => toggle(k)} />
                <span className="mono">{k}</span>
              </label>
            ))}
          </div>
          <button onClick={disclose} disabled={busy || selected.size === 0} className="btn btn-ember mt-4 disabled:opacity-50">
            {busy ? "Revealing…" : `Reveal ${selected.size || ""} detail(s)`}
          </button>
        </>
      )}
      {error && <p style={{ color: "#f87171" }} className="mt-3 text-sm">{error}</p>}
    </div>
  );
}
