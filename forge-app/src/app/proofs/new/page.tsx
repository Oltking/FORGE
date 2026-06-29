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

type PresetKey = "anything" | "builder" | "contribution" | "idea" | "ai_eval" | "forecast";
type StoredType = "generic" | "work" | "priority" | "ai_eval" | "forecast";
type Visibility = "public" | "private";

interface Row {
  key: string;
  value: string;
  placeholder?: string;
}

interface Preset {
  label: string;
  blurb: string;
  storedType: StoredType;
  defaultVisibility: Visibility;
  github?: boolean;
  rows: Row[];
}

const today = () => new Date().toISOString().slice(0, 10);

const PRESETS: Record<PresetKey, Preset> = {
  anything: {
    label: "Anything",
    blurb: "Seal anything — an idea, a note, the details of a file. Reveal what you want, when you want.",
    storedType: "generic",
    defaultVisibility: "public",
    rows: [
      { key: "", value: "", placeholder: "value" },
      { key: "", value: "", placeholder: "value" },
    ],
  },
  builder: {
    label: "Builder work",
    blurb: "Seal something you built or shipped — a feature, a project, a release. Build in public, provably.",
    storedType: "work",
    defaultVisibility: "public",
    rows: [
      { key: "what", value: "", placeholder: "e.g. Shipped v2 of the payments API" },
      { key: "project", value: "", placeholder: "e.g. acme/payments" },
      { key: "link", value: "", placeholder: "repo, demo, or release URL" },
      { key: "role", value: "", placeholder: "e.g. lead engineer" },
      { key: "date", value: today(), placeholder: "" },
    ],
  },
  contribution: {
    label: "Open-source",
    blurb: "Seal a contribution to an open-source project — a PR, commit, issue, or review. Paste a GitHub link and we'll fill it in.",
    storedType: "work",
    defaultVisibility: "public",
    github: true,
    rows: [
      { key: "project", value: "", placeholder: "owner/repo" },
      { key: "contribution", value: "", placeholder: "e.g. PR #1234: add retry logic" },
      { key: "link", value: "", placeholder: "https://github.com/owner/repo/pull/1234" },
      { key: "kind", value: "", placeholder: "PR / commit / issue / review" },
      { key: "date", value: today(), placeholder: "" },
    ],
  },
  idea: {
    label: "Idea",
    blurb: "Timestamp an idea, design, or plan before you share it. Later, prove you had it first.",
    storedType: "priority",
    defaultVisibility: "private",
    rows: [
      { key: "title", value: "", placeholder: "short name for the idea" },
      { key: "idea", value: "", placeholder: "describe it" },
      { key: "author", value: "", placeholder: "you / your team" },
      { key: "date", value: today(), placeholder: "" },
    ],
  },
  ai_eval: {
    label: "AI eval",
    blurb: "Seal a benchmark result before you publish it. Reveal after — prove you didn't cherry-pick.",
    storedType: "ai_eval",
    defaultVisibility: "private",
    rows: [
      { key: "model", value: "", placeholder: "e.g. forge-eval-1" },
      { key: "benchmark", value: "", placeholder: "e.g. MMLU-pro" },
      { key: "test_set_hash", value: "", placeholder: "hash of the eval set" },
      { key: "protocol", value: "", placeholder: "e.g. 0-shot, temp 0" },
      { key: "claimed_score", value: "", placeholder: "e.g. 0.913" },
      { key: "date", value: today(), placeholder: "" },
    ],
  },
  forecast: {
    label: "Forecast",
    blurb: "Seal a prediction before the outcome. Reveal after — prove you called it, un-backdated.",
    storedType: "forecast",
    defaultVisibility: "private",
    rows: [
      { key: "claim", value: "", placeholder: "what you predict" },
      { key: "resolution_criteria", value: "", placeholder: "how we'll know" },
      { key: "resolve_by", value: "", placeholder: "date" },
      { key: "confidence", value: "", placeholder: "e.g. 70%" },
    ],
  },
};

const PRESET_ORDER: PresetKey[] = ["anything", "builder", "contribution", "idea", "ai_eval", "forecast"];

/** Parse a GitHub PR/commit/issue URL into prefilled fields. */
function parseGithub(url: string): { project: string; kind: string; contribution: string } | null {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+)\/(pull|commit|issues)\/([^/?#]+)/i);
  if (!m) return null;
  const [, owner, repo, kindRaw, ref] = m;
  const kind = kindRaw === "pull" ? "PR" : kindRaw === "issues" ? "issue" : "commit";
  const refLabel = kind === "commit" ? ref.slice(0, 7) : `#${ref}`;
  return { project: `${owner}/${repo}`, kind, contribution: `${kind} ${refLabel}` };
}

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
  const [preset, setPreset] = useState<PresetKey>("anything");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<Row[]>(PRESETS.anything.rows.map((r) => ({ ...r })));
  const [githubUrl, setGithubUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyMsg, setBusyMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const def = PRESETS[preset];

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profile");
      const json = await res.json();
      if (json?.data?.profile) setAuthState("ready");
      else setAuthState(json?.data?.signedIn ? "noprofile" : "anon");
    })();
  }, []);

  function pick(k: PresetKey) {
    setPreset(k);
    setRows(PRESETS[k].rows.map((r) => ({ ...r })));
    setVisibility(PRESETS[k].defaultVisibility);
    setGithubUrl("");
  }
  function setRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function applyGithub(url: string) {
    setGithubUrl(url);
    const parsed = parseGithub(url);
    if (!parsed) return;
    setRows((rs) =>
      rs.map((r) => {
        if (r.key === "project") return { ...r, value: parsed.project };
        if (r.key === "link") return { ...r, value: url };
        if (r.key === "kind") return { ...r, value: parsed.kind };
        if (r.key === "contribution" && !r.value) return { ...r, value: parsed.contribution };
        return r;
      }),
    );
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
          proof_type: def.storedType,
          title: title.trim(),
          description: description.trim(),
          root: sealed.root,
          field_keys: sealed.fields.map((f) => f.key),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to seal");
      const proofId = json.data.proof.id as string;

      if (visibility === "public") {
        setBusyMsg("Making it public…");
        const openings = await makeOpenings(sealed, sealed.fields.map((f) => f.key));
        await fetch(`/api/proofs/${proofId}/disclose`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ openings }),
        });
      }

      setBusyMsg("Saving to the permanent record…");
      await fetch("/api/anchor", { method: "POST" });

      const v = await fetch(`/api/proofs/${proofId}/verify`).then((r) => r.json());
      const batch = v?.data?.proof?.batch ?? null;

      setResult({
        proofId,
        visibility,
        saved: Boolean(batch),
        backend: batch?.backend ?? null,
        diamond: batch?.diamond ?? null,
        keystore: visibility === "private" ? buildKeystore(sealed, { title: title.trim(), proof_type: def.storedType }) : null,
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

  // ---- Success ----
  if (result) {
    const savedLabel =
      result.backend === "hacash" ? "Published to the Hacash blockchain" : "Saved to Forge's permanent record";
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
              <span style={{ color: result.saved ? "#34d399" : "#f59e0b" }}>{result.saved ? "● Saved" : "○ Saving…"}</span>
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
                  Save your key file — it&apos;s the only way to unlock the private details, and we
                  don&apos;t keep a copy. Optional: skip it if you never need to reveal them.
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
      <div className="mb-1 flex items-center gap-2 text-white">
        <Diamond size={20} />
        <h1 className="text-2xl font-bold">Seal a proof</h1>
      </div>
      <p className="mb-5 text-sm text-[var(--color-fog)]">
        Put your work, ideas, and contributions on the record — permanently, in seconds.
      </p>

      <label className="label">What are you sealing?</label>
      <div className="mb-3 flex flex-wrap gap-2">
        {PRESET_ORDER.map((k) => (
          <button
            key={k}
            onClick={() => pick(k)}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              borderColor: preset === k ? "var(--color-ember)" : "var(--color-line)",
              background: preset === k ? "rgba(245,158,11,0.06)" : "transparent",
              color: preset === k ? "#fff" : "var(--color-fog)",
            }}
          >
            {PRESETS[k].label}
          </button>
        ))}
      </div>
      <p className="mb-5 text-sm text-[var(--color-fog)]">{def.blurb}</p>

      <div className="card space-y-5 p-6">
        {def.github && (
          <div>
            <label className="label">Paste a GitHub link (auto-fills the fields)</label>
            <input
              className="input"
              value={githubUrl}
              onChange={(e) => applyGithub(e.target.value)}
              placeholder="https://github.com/owner/repo/pull/1234"
            />
          </div>
        )}

        <div>
          <label className="label">Title (always public)</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A short, public headline for this proof" />
        </div>
        <div>
          <label className="label">Description (optional, public)</label>
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <label className="label">Details</label>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex gap-2">
                <input className="input mono w-1/3" placeholder="name" value={r.key} onChange={(e) => setRow(i, { key: e.target.value })} />
                <input className="input flex-1" placeholder={r.placeholder || "value"} value={r.value} onChange={(e) => setRow(i, { value: e.target.value })} />
                <button onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))} className="btn btn-ghost px-3" aria-label="remove">×</button>
              </div>
            ))}
          </div>
          <button onClick={() => setRows((rs) => [...rs, { key: "", value: "" }])} className="btn btn-ghost mt-2 text-sm">
            + Add detail
          </button>
        </div>

        <div>
          <label className="label">Who can see the details?</label>
          <div className="grid gap-2 sm:grid-cols-2">
            <VisOption active={visibility === "public"} onClick={() => setVisibility("public")} icon="🌍" title="Public" body="Everyone can see the details. No file to keep. Great for building in public." />
            <VisOption active={visibility === "private"} onClick={() => setVisibility("private")} icon="🔒" title="Private" body="Details stay hidden. Reveal what you choose later. Optional key file." />
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
      style={{ borderColor: active ? "var(--color-ember)" : "var(--color-line)", background: active ? "rgba(245,158,11,0.06)" : "transparent" }}
    >
      <div className="flex items-center gap-2 font-medium text-white">
        <span>{icon}</span>
        {title}
      </div>
      <div className="mt-1 text-xs text-[var(--color-fog)]">{body}</div>
    </button>
  );
}
