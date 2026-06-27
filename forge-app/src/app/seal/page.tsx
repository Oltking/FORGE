"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buildSeal, downloadJson, type SealDraft } from "@/lib/forge/client";
import { Diamond } from "@/components/Diamond";
import { shortHash } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/env";

interface Me {
  handle: string;
  display_name: string;
  kind: "human" | "agent";
}

const DOMAINS = [
  "Smart Contracts",
  "Protocol Design",
  "Frontend",
  "Backend",
  "Research",
  "Design",
  "Writing",
  "AI/ML",
  "DevOps",
  "Other",
];

const today = () => new Date().toISOString().slice(0, 10);

export default function SealPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [authState, setAuthState] = useState<"loading" | "anon" | "noprofile" | "ready">("loading");
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"public" | "nda">("public");
  const [draft, setDraft] = useState<SealDraft>({
    record_type: "work",
    title: "",
    description: "",
    client: "",
    domain: DOMAINS[0],
    scope: "medium",
    start_date: today(),
    end_date: today(),
    deliverable_ref: "",
    tags: [],
  });
  const [teaching, setTeaching] = useState({
    level: "intro" as "intro" | "intermediate" | "advanced",
    format: "1:1" as "1:1" | "cohort" | "async",
    hours: 1,
    outcome: "",
  });
  const isTeaching = draft.record_type === "teaching";
  const [tagInput, setTagInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<null | {
    recordId: string;
    commitment: string;
    salt: string;
    payload: unknown;
    mode: "public" | "nda";
  }>(null);
  const [anchorMsg, setAnchorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setAuthState("anon");
      return;
    }
    (async () => {
      const res = await fetch("/api/profile");
      const json = await res.json();
      const profile = json?.data?.profile;
      const signedIn = Boolean(json?.data?.signedIn);
      if (!profile) {
        setAuthState(signedIn ? "noprofile" : "anon");
        return;
      }
      setMe(profile);
      setAuthState("ready");
    })();
  }, []);

  function update<K extends keyof SealDraft>(key: K, value: SealDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && draft.tags.length < 5 && !draft.tags.includes(t)) {
      update("tags", [...draft.tags, t]);
    }
    setTagInput("");
  }

  async function submit() {
    if (!me) return;
    setBusy(true);
    setError(null);
    try {
      const draftWithTeaching: SealDraft = isTeaching
        ? { ...draft, teaching: { ...teaching, hours: Number(teaching.hours) || 0 } }
        : draft;
      const built = await buildSeal(draftWithTeaching, me.handle, me.kind);
      const body =
        mode === "public"
          ? { mode, payload: built.payload, salt: built.salt, commitment: built.commitment }
          : { mode, commitment: built.commitment };

      const res = await fetch("/api/seals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Seal failed");

      setResult({
        recordId: json.data.record.id,
        commitment: built.commitment,
        salt: built.salt,
        payload: built.payload,
        mode,
      });
      setStep(4);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function anchorNow() {
    setAnchorMsg("Anchoring…");
    const res = await fetch("/api/anchor", { method: "POST" });
    const json = await res.json();
    setAnchorMsg(res.ok ? json.data.message : json.error ?? "Anchor failed");
  }

  if (authState === "loading") {
    return <p className="pt-10 text-center text-[var(--color-fog)]">Loading…</p>;
  }
  if (authState === "anon") {
    return (
      <Gate>
        <Link href="/login" className="btn btn-ember">
          Sign in to seal work
        </Link>
      </Gate>
    );
  }
  if (authState === "noprofile") {
    return (
      <Gate>
        <Link href="/onboard" className="btn btn-ember">
          Create your profile
        </Link>
      </Gate>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-2 text-white">
        <Diamond size={20} />
        <h1 className="text-2xl font-bold">Seal a work record</h1>
      </div>

      <Steps step={step} />

      {step === 1 && (
        <div className="card mt-5 space-y-4 p-6">
          <div>
            <label className="label">Record type</label>
            <div className="grid grid-cols-2 gap-2">
              <TypeToggle active={!isTeaching} onClick={() => update("record_type", "work")} title="Work" body="A delivery your client co-signs." />
              <TypeToggle active={isTeaching} onClick={() => update("record_type", "teaching")} title="Teaching" body="A session your student co-signs." />
            </div>
          </div>

          <Field label={isTeaching ? "What did you teach?" : "What did you build?"}>
            <input
              className="input"
              value={draft.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder={isTeaching ? "e.g. Intro to Solidity — 1:1 mentorship" : "e.g. AMM Protocol V2 — core implementation"}
            />
          </Field>
          <Field label={isTeaching ? "What was covered?" : "Description"}>
            <textarea className="input" rows={4} value={draft.description} onChange={(e) => update("description", e.target.value)} placeholder={isTeaching ? "Topics, exercises, materials." : "What was delivered."} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={isTeaching ? "Student (name or wallet)" : "Client (name or wallet)"}>
              <input className="input" value={draft.client} onChange={(e) => update("client", e.target.value)} placeholder={isTeaching ? "alex.eth" : "DeFi Labs"} />
            </Field>
            <Field label={isTeaching ? "Subject" : "Domain"}>
              <input className="input" value={draft.domain} onChange={(e) => update("domain", e.target.value)} placeholder={isTeaching ? "Solidity" : undefined} list={isTeaching ? undefined : "domain-list"} />
              {!isTeaching && (
                <datalist id="domain-list">
                  {DOMAINS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              )}
            </Field>
          </div>

          {isTeaching && (
            <div className="space-y-4 rounded-lg border border-[var(--color-line)] bg-[var(--color-ink)] p-4">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Level">
                  <select className="input" value={teaching.level} onChange={(e) => setTeaching((t) => ({ ...t, level: e.target.value as typeof t.level }))}>
                    <option value="intro">Intro</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </Field>
                <Field label="Format">
                  <select className="input" value={teaching.format} onChange={(e) => setTeaching((t) => ({ ...t, format: e.target.value as typeof t.format }))}>
                    <option value="1:1">1:1</option>
                    <option value="cohort">Cohort</option>
                    <option value="async">Async</option>
                  </select>
                </Field>
                <Field label="Hours">
                  <input type="number" min={0} step={0.5} className="input" value={teaching.hours} onChange={(e) => setTeaching((t) => ({ ...t, hours: Number(e.target.value) }))} />
                </Field>
              </div>
              <Field label="Outcome — what can the student now do?">
                <textarea className="input" rows={2} value={teaching.outcome} onChange={(e) => setTeaching((t) => ({ ...t, outcome: e.target.value }))} placeholder="e.g. Can write, test, and deploy an ERC-20 unaided." />
              </Field>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <Field label="Scope">
              <select className="input" value={draft.scope} onChange={(e) => update("scope", e.target.value as SealDraft["scope"])}>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </Field>
            <Field label="Start">
              <input type="date" className="input" value={draft.start_date} onChange={(e) => update("start_date", e.target.value)} />
            </Field>
            <Field label="End">
              <input type="date" className="input" value={draft.end_date} onChange={(e) => update("end_date", e.target.value)} />
            </Field>
          </div>
          <Field label="Deliverable reference (optional)">
            <input className="input" value={draft.deliverable_ref} onChange={(e) => update("deliverable_ref", e.target.value)} placeholder="github.com/... PR, contract address, file hash" />
          </Field>
          <Field label="Tags (max 5)">
            <div className="flex gap-2">
              <input
                className="input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="solidity, evm, defi"
              />
              <button onClick={addTag} className="btn btn-ghost">Add</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {draft.tags.map((t) => (
                <button key={t} onClick={() => update("tags", draft.tags.filter((x) => x !== t))} className="rounded-full bg-[var(--color-panel-2)] px-2.5 py-0.5 text-xs text-[var(--color-mist)]">
                  {t} ×
                </button>
              ))}
            </div>
          </Field>
          <button
            onClick={() => setStep(2)}
            disabled={!draft.title || !draft.description || !draft.client || (isTeaching && !teaching.outcome)}
            className="btn btn-ember w-full disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card mt-5 space-y-4 p-6">
          <h2 className="font-semibold text-white">Visibility</h2>
          <ModeOption
            active={mode === "public"}
            onClick={() => setMode("public")}
            title="Public seal"
            body="The record is visible now — un-editable and un-backdatable. Best for a record you want your client to co-sign."
          />
          <ModeOption
            active={mode === "nda"}
            onClick={() => setMode("nda")}
            title="NDA mode (commit–reveal)"
            body="Only the commitment hash is stored. The contents stay private until you choose to reveal them. The plaintext never leaves your browser."
          />
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn btn-ghost flex-1">Back</button>
            <button onClick={() => setStep(3)} className="btn btn-ember flex-1">Review</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card mt-5 space-y-4 p-6">
          <h2 className="font-semibold text-white">Seal &amp; anchor</h2>
          <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-ink)] p-4 text-sm">
            <Summary label="Title" value={draft.title} />
            <Summary label="Client" value={draft.client} />
            <Summary label="Domain" value={`${draft.domain} · ${draft.scope}`} />
            <Summary label="Worker" value={`@${me?.handle} (${me?.kind})`} />
            <Summary label="Mode" value={mode === "nda" ? "NDA (hash only)" : "Public"} />
          </div>
          <p className="text-sm text-[var(--color-fog)]">
            Your record is hashed with a per-seal salt and committed. It will be anchored to a HACD
            via a Merkle root at the next batch. A small HAC fee applies on-chain.
          </p>
          {error && <p style={{ color: "#f87171" }} className="text-sm">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn btn-ghost flex-1">Back</button>
            <button onClick={submit} disabled={busy} className="btn btn-ember flex-1 disabled:opacity-50">
              {busy ? "Forging…" : "Forge this record"}
            </button>
          </div>
        </div>
      )}

      {step === 4 && result && (
        <div className="card mt-5 space-y-4 p-6">
          <div className="flex items-center gap-2 text-[var(--color-green)]">
            <span className="text-xl">✓</span>
            <h2 className="font-semibold">Record sealed</h2>
          </div>
          <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-ink)] p-4 font-mono text-xs leading-relaxed">
            <div className="text-[var(--color-fog)]">SEAL RECEIPT</div>
            <div className="mt-2">commitment: {shortHash(result.commitment, 12, 10)}</div>
            <div>salt: {shortHash(result.salt, 10, 8)}</div>
            <div>mode: {result.mode}</div>
          </div>
          {result.mode === "nda" && (
            <p className="text-sm text-[var(--color-ember)]">
              Important: download your receipt now. For NDA seals, your payload + salt exist only
              in this browser — without them the record cannot be revealed or verified.
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() =>
                downloadJson(`forge-receipt-${result.commitment.slice(0, 12)}.json`, {
                  forge_receipt: "v1",
                  record_id: result.recordId,
                  commitment: result.commitment,
                  salt: result.salt,
                  payload: result.payload,
                  mode: result.mode,
                  verify_url: `${location.origin}/verify/${result.commitment}`,
                })
              }
              className="btn btn-ghost"
            >
              Download receipt
            </button>
            <Link href={`/verify/${result.commitment}`} className="btn btn-ghost">
              Verify
            </Link>
          </div>
          <div className="border-t border-[var(--color-line)] pt-4">
            <button onClick={anchorNow} className="btn btn-ember w-full">
              Anchor pending batch now
            </button>
            {anchorMsg && <p className="mt-2 text-center text-sm text-[var(--color-fog)]">{anchorMsg}</p>}
          </div>
          <Link href={`/record/${result.recordId}`} className="block text-center text-sm text-[var(--color-ember)] hover:underline">
            View record →
          </Link>
        </div>
      )}
    </div>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md pt-16 text-center">
      <Diamond size={28} className="mx-auto" />
      <h1 className="mt-4 text-xl font-bold text-white">Seal your work on Forge</h1>
      <p className="mt-2 mb-6 text-sm text-[var(--color-fog)]">
        You need a Forge profile to seal records.
      </p>
      {children}
    </div>
  );
}

function Steps({ step }: { step: number }) {
  const labels = ["Details", "Visibility", "Review", "Done"];
  return (
    <div className="flex gap-2">
      {labels.map((l, i) => (
        <div key={l} className="flex-1">
          <div
            className="h-1 rounded-full"
            style={{ background: i + 1 <= step ? "var(--color-ember)" : "var(--color-line)" }}
          />
          <span className="mt-1 block text-xs text-[var(--color-fog)]">{l}</span>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function TypeToggle({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
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
      <div className="font-medium text-white">{title}</div>
      <div className="mt-0.5 text-xs text-[var(--color-fog)]">{body}</div>
    </button>
  );
}

function ModeOption({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border p-4 text-left transition-colors"
      style={{
        borderColor: active ? "var(--color-ember)" : "var(--color-line)",
        background: active ? "rgba(245,158,11,0.06)" : "transparent",
      }}
    >
      <div className="font-medium text-white">{title}</div>
      <div className="mt-1 text-sm text-[var(--color-fog)]">{body}</div>
    </button>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[var(--color-line)] py-1.5 last:border-0">
      <span className="text-[var(--color-fog)]">{label}</span>
      <span className="text-right text-white">{value}</span>
    </div>
  );
}
