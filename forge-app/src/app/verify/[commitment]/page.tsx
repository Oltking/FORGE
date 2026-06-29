import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { ConfigNotice } from "@/components/ConfigNotice";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifyRecordByCommitment } from "@/lib/forge/verify";
import { getProofByRoot } from "@/lib/db/repo";
import { TrustBadge } from "@/components/badges";
import { CopyHash } from "@/components/CopyHash";
import { formatDateTimeUTC } from "@/lib/format";
import { blockExplorerUrl, diamondExplorerUrl } from "@/lib/hacash/diamond";

export const dynamic = "force-dynamic";

export default async function VerifyResultPage({
  params,
}: {
  params: Promise<{ commitment: string }>;
}) {
  if (!isSupabaseConfigured()) return <ConfigNotice />;
  const { commitment } = await params;
  const db = await createSupabaseServerClient();

  // A proof's fingerprint (root) lives in the proofs table — send those to the
  // proof page, which is the full verification view.
  const proof = await getProofByRoot(db, commitment);
  if (proof) redirect(`/proof/${proof.id}`);

  const result = await verifyRecordByCommitment(db, commitment);

  const verified =
    result.found &&
    result.inclusionValid === true &&
    result.commitmentValid !== false;

  const record = result.record;
  const batch = result.batch;
  const onChain = batch?.backend === "hacash";
  const isHidden = record?.mode === "nda" && !record?.revealed_at;

  return (
    <div className="mx-auto max-w-2xl pt-6">
      <div
        className="card overflow-hidden"
        style={{ borderColor: verified ? "rgba(52,211,153,0.4)" : "var(--color-line)" }}
      >
        <div
          className="flex items-center gap-3 px-6 py-4"
          style={{ background: verified ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.06)" }}
        >
          <span className="text-2xl">{verified ? "✓" : result.found ? "◷" : "✕"}</span>
          <div>
            <h1 className="text-lg font-bold text-white">
              {verified
                ? "Verified on HACD"
                : result.found
                  ? "Sealed — pending anchor"
                  : "Not found"}
            </h1>
            <p className="text-sm text-[var(--color-fog)]">
              {verified
                ? "This record is permanent. Neither party can edit it."
                : result.found
                  ? "This commitment exists but is not yet in a confirmed batch."
                  : "No sealed record matches this commitment."}
            </p>
          </div>
        </div>

        {record && (
          <div className="space-y-4 px-6 py-5">
            <Row label="Record">
              {isHidden ? <span className="text-[var(--color-fog)]">NDA — withheld until reveal</span> : record.title}
            </Row>
            {!isHidden && (
              <>
                <Row label="Worker">
                  {record.worker ? (
                    <Link href={`/worker/${record.worker.handle}`} className="text-[var(--color-ember)] hover:underline">
                      @{record.worker.handle}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Row>
                <Row label="Client">{record.client_handle}</Row>
              </>
            )}
            <Row label="Attestation">
              <TrustBadge tier={record.trust_tier} />
            </Row>
            <Row label="Sealed">{formatDateTimeUTC(record.created_at)}</Row>
            {batch && (
              <>
                <Row label="HACD">
                  <CopyHash value={batch.diamond} href={onChain ? diamondExplorerUrl(batch.diamond) : undefined} />
                </Row>
                {batch.block_height && (
                  <Row label="Block">
                    <a href={blockExplorerUrl(batch.block_height)} target="_blank" rel="noreferrer" className="mono text-[var(--color-ember)] hover:underline">
                      {batch.block_height.toLocaleString()}
                    </a>
                  </Row>
                )}
                <Row label="Saved to">
                  <span className={onChain ? "text-[var(--color-green)]" : "text-[var(--color-fog)]"}>
                    {onChain ? "Hacash blockchain" : "Forge ledger (dev)"}
                  </span>
                </Row>
                <Row label="Merkle root">
                  <CopyHash value={batch.root} href={onChain ? diamondExplorerUrl(batch.diamond) : undefined} />
                </Row>
              </>
            )}
            <Row label="Commitment">
              <CopyHash value={record.commitment} />
            </Row>

            <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-ink)] p-3">
              <p className="mb-1.5 text-xs uppercase tracking-wide text-[var(--color-fog)]">
                Verification steps
              </p>
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
        )}
      </div>

      <p className="mt-4 text-center text-xs text-[var(--color-fog)]">
        Verified against explorer.hacash.org · this check uses only the commitment and Merkle
        proof, not Forge&apos;s database.
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] pb-2 last:border-0">
      <span className="text-sm text-[var(--color-fog)]">{label}</span>
      <span className="text-right text-sm text-white">{children}</span>
    </div>
  );
}
