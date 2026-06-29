import Link from "next/link";
import { notFound } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { ConfigNotice } from "@/components/ConfigNotice";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { verifyProofById } from "@/lib/forge/proof";
import { Diamond } from "@/components/Diamond";
import { Pill } from "@/components/badges";
import { DisclosePanel } from "@/components/DisclosePanel";
import { AnchorButton } from "@/components/AnchorButton";
import { formatDateTimeUTC, shortHash } from "@/lib/format";
import { diamondExplorerUrl, blockExplorerUrl } from "@/lib/hacash/diamond";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  ai_eval: "AI eval",
  priority: "Priority / IP",
  forecast: "Forecast",
  work: "Work",
  generic: "Proof",
};

export default async function ProofPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) return <ConfigNotice />;
  const { id } = await params;
  const db = await createSupabaseServerClient();
  const result = await verifyProofById(db, id);
  if (!result.found || !result.proof) notFound();

  const proof = result.proof;
  const { profile } = await getSession();
  const isAuthor = profile?.id === proof.author_id;

  const disclosedKeys = Object.keys(proof.disclosed ?? {});
  const validByKey = new Map(result.disclosedFields.map((f) => [f.key, f.valid]));
  const anchoredOk = result.inclusionValid === true;
  const fullyVerified = anchoredOk && (result.disclosedValid ?? true);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div
          className="card overflow-hidden"
          style={{ borderColor: fullyVerified && proof.batch ? "rgba(52,211,153,0.4)" : "var(--color-line)" }}
        >
          <div
            className="flex items-center gap-3 px-6 py-4"
            style={{ background: anchoredOk ? "rgba(52,211,153,0.08)" : "rgba(245,158,11,0.06)" }}
          >
            <span className="text-2xl">{anchoredOk ? "✓" : "◷"}</span>
            <div>
              <h1 className="text-lg font-bold text-white">{proof.title}</h1>
              <p className="text-sm text-[var(--color-fog)]">
                <Pill>{TYPE_LABEL[proof.proof_type] ?? proof.proof_type}</Pill>{" "}
                {proof.author ? (
                  <Link href={`/worker/${proof.author.handle}`} className="ml-2 text-[var(--color-mist)] hover:underline">
                    @{proof.author.handle}
                  </Link>
                ) : null}
              </p>
            </div>
          </div>

          <div className="space-y-4 px-6 py-5">
            {proof.description && <p className="text-[var(--color-mist)]">{proof.description}</p>}

            {/* Sealed fields */}
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-[var(--color-fog)]">
                Sealed fields ({proof.field_keys.length})
              </p>
              <div className="overflow-hidden rounded-lg border border-[var(--color-line)]">
                {proof.field_keys.map((key, i) => {
                  const opening = proof.disclosed?.[key];
                  const isDisclosed = Boolean(opening);
                  const valid = validByKey.get(key);
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                      style={{
                        background: i % 2 ? "var(--color-ink)" : "transparent",
                        borderTop: i ? "1px solid var(--color-line)" : "none",
                      }}
                    >
                      <span className="mono text-[var(--color-fog)]">{key}</span>
                      {isDisclosed ? (
                        <span className="flex items-center gap-2">
                          <span className="text-white">{String(opening!.value)}</span>
                          <span title="reconciles with sealed root" style={{ color: valid ? "#34d399" : "#f87171" }}>
                            {valid ? "✓" : "✕"}
                          </span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[var(--color-fog)]">🔒 sealed</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Verification steps */}
            <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-ink)] p-3">
              <p className="mb-1.5 text-xs uppercase tracking-wide text-[var(--color-fog)]">Verification</p>
              <ul className="space-y-1 text-sm text-[var(--color-mist)]">
                {result.notes.map((n, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[var(--color-fog)]">·</span>
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {isAuthor && (
          <DisclosePanel
            proofId={proof.id}
            proofRoot={proof.root}
            sealedKeys={proof.field_keys}
            disclosedKeys={disclosedKeys}
          />
        )}
      </div>

      {/* Anchor sidebar */}
      <aside className="space-y-4">
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2 text-white">
            <Diamond size={16} />
            <h3 className="font-semibold">On-chain anchor</h3>
          </div>
          <dl className="space-y-2 text-sm">
            <Item label="Sealed">{formatDateTimeUTC(proof.created_at)}</Item>
            <Item label="HACD">
              {proof.batch ? (
                <a href={diamondExplorerUrl(proof.batch.diamond)} target="_blank" rel="noreferrer" className="mono text-[var(--color-ember)] hover:underline">
                  {proof.batch.diamond}
                </a>
              ) : (
                <span className="mono">pending</span>
              )}
            </Item>
            <Item label="Block">
              {proof.batch?.block_height ? (
                <a href={blockExplorerUrl(proof.batch.block_height)} target="_blank" rel="noreferrer" className="mono text-[var(--color-ember)] hover:underline">
                  {proof.batch.block_height.toLocaleString()}
                </a>
              ) : (
                <span className="mono">—</span>
              )}
            </Item>
            <Item label="Backend">
              <span className="mono">{proof.batch?.backend ?? "—"}</span>
            </Item>
            <Item label="Proof root">
              <span className="mono text-xs">{shortHash(proof.root, 8, 6)}</span>
            </Item>
            <Item label="Status">
              <span style={{ color: proof.visibility === "revealed" ? "#34d399" : "var(--color-fog)" }}>
                {proof.visibility}
              </span>
            </Item>
          </dl>
        </div>

        {isAuthor && !proof.batch && (
          <div className="card p-5">
            <p className="mb-3 text-sm text-[var(--color-fog)]">This proof isn&apos;t anchored yet.</p>
            <AnchorButton />
          </div>
        )}

        <Link href="/proofs" className="block text-center text-sm text-[var(--color-ember)] hover:underline">
          ← All proofs
        </Link>
      </aside>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] pb-2 last:border-0">
      <dt className="text-[var(--color-fog)]">{label}</dt>
      <dd className="text-right text-white">{children}</dd>
    </div>
  );
}
