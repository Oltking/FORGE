"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buildProof, buildKeystore, downloadJson, type FieldMap } from "@/lib/forge/proof-client";
import { Diamond } from "@/components/Diamond";
import { shortHash } from "@/lib/format";

type ProofType = "ai_eval" | "priority" | "forecast" | "generic";

interface Row {
  key: string;
  value: string;
}

const PRESETS: Record<ProofType, { label: string; blurb: string; rows: Row[] }> = {
  ai_eval: {
    label: "AI eval",
    blurb: "Seal a benchmark result before you publish it. Reveal after — prove you didn't cherry-pick or move the goalposts.",
    rows: [
      { key: "model", value: "" },
      { key: "benchmark", value: "" },
      { key: "test_set_hash", value: "" },
      { key: "protocol", value: "" },
      { key: "claimed_score", value: "" },
      { key: "date", value: new Date().toISOString().slice(0, 10) },
    ],
  },
  priority: {
    label: "Priority / IP",
    blurb: "Seal an idea, design, or result now. Later prove you had it first — without revealing it early.",
    rows: [
      { key: "title", value: "" },
      { key: "summary", value: "" },
      { key: "author", value: "" },
      { key: "date", value: new Date().toISOString().slice(0, 10) },
    ],
  },
  forecast: {
    label: "Forecast",
    blurb: "Seal a prediction before the outcome. Reveal after — prove you called it, un-backdated.",
    rows: [
      { key: "claim", value: "" },
      { key: "resolution_criteria", value: "" },
      { key: "resolve_by", value: "" },
      { key: "confidence", value: "" },
    ],
  },
  generic: {
    label: "Generic",
    blurb: "Seal any set of fields. Disclose whichever you choose, whenever you choose.",
    rows: [
      { key: "", value: "" },
      { key: "", value: "" },
    ],
  },
};

export default function NewProofPage() {
  const router = useRouter();
  const [authState, setAuthState] = useState<"loading" | "anon" | "noprofile" | "ready">("loading");
  const [type, setType] = useState<ProofType>("ai_eval");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<Row[]>(PRESETS.ai_eval.rows);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profile");
      const json = await res.json();
      if (json?.data?.profile) setAuthState("ready");
      else setAuthState(json?.data?.signedIn ? "noprofile" : "anon");
    })();
  }, []);

  function pickType(t: ProofType) {
    setType(t);
    setRows(PRESETS[t].rows.map((r) => ({ ...r })));
  }

  function setRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const fields: FieldMap = {};
      for (const r of rows) {
        const k = r.key.trim();
        if (!k) continue;
        if (k in fields) throw new Error(`duplicate field "${k}"`);
        fields[k] = r.value;
      }
      if (Object.keys(fields).length === 0) throw new Error("add at least one field");
      if (!title.trim()) throw new Error("add a title");

      const sealed = await buildProof(fields);

      const res = await fetch("/api/proofs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          proof_type: type,
          title: title.trim(),
          description: description.trim(),
          root: sealed.root,
          field_keys: sealed.fields.map((f) => f.key),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to seal proof");

      // Export the keystore — without it, sealed fields can never be disclosed.
      downloadJson(
        `forge-keystore-${sealed.root.slice(0, 12)}.json`,
        buildKeystore(sealed, { title: title.trim(), proof_type: type }),
      );

      router.push(`/proof/${json.data.proof.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (authState === "loading") return <p className="pt-10 text-center text-[var(--color-fog)]">Loading…</p>;
  if (authState !== "ready") {
    return (
      <div className="mx-auto max-w-md pt-16 text-center">
        <Diamond size={28} className="mx-auto" />
        <h1 className="mt-4 text-xl font-bold text-white">Seal a proof</h1>
        <p className="mt-2 mb-6 text-sm text-[var(--color-fog)]">You need a Forge profile first.</p>
        <Link href={authState === "anon" ? "/login" : "/onboard"} className="btn btn-ember">
          {authState === "anon" ? "Sign in" : "Create profile"}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-2 text-white">
        <Diamond size={20} />
        <h1 className="text-2xl font-bold">Seal a proof</h1>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2">
        {(Object.keys(PRESETS) as ProofType[]).map((t) => (
          <button
            key={t}
            onClick={() => pickType(t)}
            className="rounded-lg border p-2 text-sm font-medium transition-colors"
            style={{
              borderColor: type === t ? "var(--color-ember)" : "var(--color-line)",
              background: type === t ? "rgba(245,158,11,0.06)" : "transparent",
              color: type === t ? "#fff" : "var(--color-fog)",
            }}
          >
            {PRESETS[t].label}
          </button>
        ))}
      </div>
      <p className="mb-5 text-sm text-[var(--color-fog)]">{PRESETS[type].blurb}</p>

      <div className="card space-y-4 p-6">
        <div>
          <label className="label">Title (public)</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. forge-eval-1 on MMLU-pro" />
        </div>
        <div>
          <label className="label">Description (public)</label>
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <label className="label">Sealed fields — values stay hidden until you disclose them</label>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className="input mono w-1/3"
                  placeholder="field"
                  value={r.key}
                  onChange={(e) => setRow(i, { key: e.target.value })}
                />
                <input
                  className="input flex-1"
                  placeholder="value (hidden once sealed)"
                  value={r.value}
                  onChange={(e) => setRow(i, { value: e.target.value })}
                />
                <button
                  onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
                  className="btn btn-ghost px-3"
                  aria-label="remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => setRows((rs) => [...rs, { key: "", value: "" }])} className="btn btn-ghost mt-2 text-sm">
            + Add field
          </button>
        </div>

        <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-ink)] p-3 text-sm text-[var(--color-fog)]">
          On seal, each field is committed under its own salt and Merkle-rooted. Only the root and
          field <em>names</em> are stored. Your values + salts download as a keystore — keep it, it&apos;s
          the only way to disclose later.
        </div>

        {error && <p style={{ color: "#f87171" }} className="text-sm">{error}</p>}
        <button onClick={submit} disabled={busy} className="btn btn-ember w-full disabled:opacity-50">
          {busy ? "Sealing…" : "Seal proof"}
        </button>
      </div>
    </div>
  );
}
