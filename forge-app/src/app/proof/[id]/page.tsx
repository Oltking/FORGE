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
import { PlainCallout } from "@/components/PlainCallout";
import { InfoHint } from "@/components/InfoHint";
import { CopyHash } from "@/components/CopyHash";
import { formatDate, formatDateTimeUTC } from "@/lib/format";
import { diamondExplorerUrl, blockExplorerUrl, txExplorerUrl } from "@/lib/hacash/diamond";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  ai_eval: "AI eval",
  priority: "Idea",
  forecast: "Forecast",
  work: "Build",
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

  const who = proof.author ? `@${proof.author.handle}` : "Someone";
  const sealedOn = formatDate(proof.created_at);
  const plain: { icon: string; tone: "good" | "warn" | "neutral"; text: string } = !proof.batch
    ? {
        icon: "⏳",
        tone: "warn",
        text: `Just sealed — Forge is saving it to the permanent record now. Once that's done, it can never be changed or back-dated.`,
      }
    : disclosedKeys.length === 0
      ? {
          icon: "🔒",
          tone: "neutral",
          text: `${who} sealed this on ${sealedOn} and saved it permanently. The details are still private — they can be revealed later and proven to be exactly what was sealed today.`,
        }
      : fullyVerified
        ? {
            icon: "✅",
            tone: "good",
            text: `${who} sealed this on ${sealedOn}, before sharing it. The revealed details below are genuine and have not been changed since. Any field still marked "sealed" stays private.`,
          }
        : {
            icon: "⚠️",
            tone: "warn",
            text: `Something doesn't add up — a revealed detail or the saved record doesn't match what was originally sealed. Treat this proof with caution.`,
          };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <PlainCallout icon={plain.icon} tone={plain.tone}>
          {plain.text}
        </PlainCallout>

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
              <p className="mb-2 flex items-center text-xs uppercase tracking-wide text-[var(--color-fog)]">
                Details ({proof.field_keys.length})
                <InfoHint>
                  Each item was locked separately. 🔒 means it&apos;s still private. A value with a
                  green ✓ has been revealed and proven to match exactly what was sealed.
                </InfoHint>
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
            <h3 className="font-semibold">Where it&apos;s saved</h3>
            <InfoHint>
              The technical proof that this record is permanent and tamper-proof. You don&apos;t need
              any of this to trust it — it&apos;s here for anyone who wants to check independently.
            </InfoHint>
          </div>
          {(() => {
            const onChain = proof.batch?.backend === "hacash";
            return (
              <dl className="space-y-2 text-sm">
                <Item label="Sealed on">{formatDateTimeUTC(proof.created_at)}</Item>
                <Item
                  label="Fingerprint"
                  hint="A unique code computed from your sealed details. It can't be reversed into the details, but it changes if even one character changes — so it proves nothing was altered. This is what gets written to the ledger."
                >
                  <CopyHash value={proof.root} href={onChain ? diamondExplorerUrl(proof.batch!.diamond) : undefined} />
                </Item>
                {proof.batch && (
                  <Item
                    label="Ledger slot"
                    hint="HACD — a unique slot on the Hacash ledger holding this proof's fingerprint."
                  >
                    <CopyHash
                      value={proof.batch.diamond}
                      href={onChain ? diamondExplorerUrl(proof.batch.diamond) : undefined}
                    />
                  </Item>
                )}
                {proof.batch?.tx_hash && (
                  <Item label="Transaction" hint="The on-chain transaction that wrote this proof.">
                    <CopyHash value={proof.batch.tx_hash} href={onChain ? txExplorerUrl(proof.batch.tx_hash) : undefined} />
                  </Item>
                )}
                {proof.batch?.block_height && (
                  <Item label="Block">
                    <a href={blockExplorerUrl(proof.batch.block_height)} target="_blank" rel="noreferrer" className="mono text-[var(--color-ember)] hover:underline">
                      {proof.batch.block_height.toLocaleString()}
                    </a>
                  </Item>
                )}
                <Item
                  label="Saved to"
                  hint="'Hacash blockchain' = written to the public chain, checkable on explorer.hacash.org. 'Forge ledger (dev)' = cryptographically real and tamper-proof, but not yet on the public chain."
                >
                  <span className={onChain ? "text-[var(--color-green)]" : "text-[var(--color-fog)]"}>
                    {!proof.batch ? "saving…" : onChain ? "Hacash blockchain" : "Forge ledger (dev)"}
                  </span>
                </Item>
              </dl>
            );
          })()}

          {proof.batch && proof.batch.backend !== "hacash" && (
            <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-xs text-[var(--color-fog)]">
              This proof is saved and tamper-proof, but not yet on the public Hacash chain — so there&apos;s
              no explorer page to open. The fingerprint above is copyable and will match once published.
            </p>
          )}
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

function Item({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] pb-2 last:border-0">
      <dt className="flex items-center text-[var(--color-fog)]">
        {label}
        {hint ? <InfoHint>{hint}</InfoHint> : null}
      </dt>
      <dd className="text-right text-white">{children}</dd>
    </div>
  );
}
