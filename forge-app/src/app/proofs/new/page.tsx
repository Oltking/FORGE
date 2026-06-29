"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  buildProof,
  buildKeystore,
  makeOpenings,
  downloadJson,
  type FieldMap,
} from "@/lib/forge/proof-client";
import { Diamond } from "@/components/Diamond";

type ProofType = "ai_eval" | "priority" | "forecast" | "generic";
type Visibility = "public" | "private";

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
    label: "Anything",
    blurb: "Seal any set of details. Reveal whichever you choose, whenever you choose.",
    rows: [
      { key: "", value: "" },
      { key: "", value: "" },
    ],
  },
};

interface Result {
  proofId: string;
  visibility: Visibility;
  saved: boolean;
  backend: string | null;
  diamond: string | null;
  keystore: ReturnType<typeof buildKeystore> | null;
  title: string;
  fieldCount: number;
}

export default function NewProofPage() {
  const [authState, setAuthState] = useState<"loading" | "anon" | "noprofile" | "ready">("loading");
  const [type, setType] = useState<ProofType>("ai_eval");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<Row[]>(PRESETS.ai_eval.rows);
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [downloaded, setDownloaded] = useState(false);

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
      if (Object.keys(fields).length === 0) throw new Error("add at least one detail");
      if (!title.trim()) throw new Error("add a title");

      setBusyMsg("Sealing…");
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
      if (!res.ok) throw new Error(json.error ?? "Failed to seal");
      const proofId = json.data.proof.id as string;

      // Public proofs reveal everything immediately — no key file needed.
      if (visibility === "public") {
        setBusyMsg("Making it public…");
        const openings = await makeOpenings(sealed, sealed.fields.map((f) => f.key));
        await fetch(`/api/proofs/${proofId}/disclose`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ openings }),
        });
      }

      // Save it straight away so it isn't stuck "pending".
      setBusyMsg("Saving to the permanent record…");
      await fetch("/api/anchor", { method: "POST" });

      // Read back the saved state.
      const v = await fetch(`/api/proofs/${proofId}/verify`).then((r) => r.json());
      const batch = v?.data?.proof?.batch ?? null;

      setResult({
        proofId,
        visibility,
        saved: Boolean(batch),
        backend: batch?.backend ?? null,
        diamond: batch?.diamond ?? null,
        keystore: visibility === "private" ? buildKeystore(sealed, { title: title.trim(), proof_type: type }) : null,
        title: title.trim(),
        fieldCount: sealed.fields.length,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setBusyMsg("");
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

  // ---- Success screen ----
  if (result) {
    const savedLabel =
      result.backend === "hacash"
        ? "Published to the Hacash blockchain"
        : "Saved to Forge's permanent record";
    return (
      <div className="mx-auto max-w-lg pt-8">
        <div className="card overflow-hidden text-center">
          <div className="bg-gradient-to-b from-[rgba(52,211,153,0.12)] to-transparent px-6 pt-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(52,211,153,0.15)] text-3xl">
              ✓
            </div>
            <h1 className="mt-4 text-2xl font-bold text-white">Your proof is sealed</h1>
            <p className="mt-1 text-[var(--color-fog)]">
              “{result.title}” — {result.fieldCount} detail{result.fieldCount === 1 ? "" : "s"},{" "}
              {result.visibility === "public" ? "public" : "private"}.
            </p>
          </div>

          <div className="space-y-4 px-6 py-6">
            <div className="flex items-center justify-center gap-2 text-sm">
              <span style={{ color: result.saved ? "#34d399" : "#f59e0b" }}>
                {result.saved ? "● Saved" : "○ Saving…"}
              </span>
              <span className="text-[var(--color-fog)]">{savedLabel}</span>
              {result.diamond && (
                <span className="mono inline-flex items-center gap-1 text-[var(--color-fog)]">
                  <Diamond size={11} /> {result.diamond}
                </span>
              )}
            </div>

            {result.visibility === "private" && result.keystore && (
              <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-ink)] p-4 text-left text-sm">
                <p className="font-medium text-white">Want to reveal hidden details later?</p>
                <p className="mt-1 text-[var(--color-fog)]">
                  Save your key file. It&apos;s the only way to unlock the private details — we don&apos;t
                  keep a copy. Optional: skip it if you never need to reveal them.
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={() => {
                      downloadJson(`forge-key-${result.proofId.slice(0, 8)}.json`, result.keystore);
                      setDownloaded(true);
                    }}
                    className="btn btn-ghost text-sm"
                  >
                    {downloaded ? "✓ Downloaded" : "Download key file"}
                  </button>
                  {!downloaded && <span className="text-xs text-[var(--color-fog)]">or skip — your call</span>}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Link href={`/proof/${result.proofId}`} className="btn btn-ember flex-1">
                View proof
              </Link>
              <Link href="/proofs/new" className="btn btn-ghost flex-1" onClick={() => setResult(null)}>
                Seal another
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Form ----
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

      <div className="card space-y-5 p-6">
        <div>
          <label className="label">Title (always public)</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. forge-eval-1 on MMLU-pro" />
        </div>
        <div>
          <label className="label">Description (always public)</label>
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <label className="label">Details</label>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex gap-2">
                <input className="input mono w-1/3" placeholder="name" value={r.key} onChange={(e) => setRow(i, { key: e.target.value })} />
                <input className="input flex-1" placeholder="value" value={r.value} onChange={(e) => setRow(i, { value: e.target.value })} />
                <button onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} className="btn btn-ghost px-3" aria-label="remove">×</button>
              </div>
            ))}
          </div>
          <button onClick={() => setRows((rs) => [...rs, { key: "", value: "" }])} className="btn btn-ghost mt-2 text-sm">
            + Add detail
          </button>
        </div>

        {/* Visibility */}
        <div>
          <label className="label">Who can see the details?</label>
          <div className="grid gap-2 sm:grid-cols-2">
            <VisOption
              active={visibility === "public"}
              onClick={() => setVisibility("public")}
              icon="🌍"
              title="Public"
              body="Everyone can see the details. No file to keep. Best for proving something openly."
            />
            <VisOption
              active={visibility === "private"}
              onClick={() => setVisibility("private")}
              icon="🔒"
              title="Private"
              body="Details stay hidden. You choose what to reveal later. You'll get an optional key file."
            />
          </div>
        </div>

        {error && <p style={{ color: "#f87171" }} className="text-sm">{error}</p>}
        <button onClick={submit} disabled={busy} className="btn btn-ember w-full disabled:opacity-50">
          {busy ? busyMsg || "Working…" : "Seal proof"}
        </button>
      </div>
    </div>
  );
}

function VisOption({
  active,
  onClick,
  icon,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border p-3 text-left transition-colors"
      style={{
        borderColor: active ? "var(--color-ember)" : "var(--color-line)",
        background: active ? "rgba(245,158,11,0.06)" : "transparent",
      }}
    >
      <div className="flex items-center gap-2 font-medium text-white">
        <span>{icon}</span>
        {title}
      </div>
      <div className="mt-1 text-xs text-[var(--color-fog)]">{body}</div>
    </button>
  );
}
