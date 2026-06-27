import Link from "next/link";
import { notFound } from "next/navigation";
import { loadRecord } from "@/lib/page-data";
import { ConfigNotice } from "@/components/ConfigNotice";
import { StatusBadge, TrustBadge, Pill } from "@/components/badges";
import { Diamond } from "@/components/Diamond";
import { AttestPanel } from "@/components/AttestPanel";
import { formatDate, formatDateTimeUTC, shortHash } from "@/lib/format";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await loadRecord(id);
  if (record === "unconfigured") return <ConfigNotice />;
  if (!record) notFound();

  const { profile } = await getSession();
  const isHidden = record.mode === "nda" && !record.revealed_at;
  const isOwner = profile?.id === record.worker_id;
  const canAttest = Boolean(profile) && !isOwner && !isHidden;
  const attestations = record.attestations ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {isHidden ? "Sealed record (NDA)" : record.title}
              </h1>
              <p className="mt-1 text-[var(--color-fog)]">
                {record.worker ? (
                  <Link href={`/worker/${record.worker.handle}`} className="text-[var(--color-mist)] hover:underline">
                    @{record.worker.handle}
                  </Link>
                ) : null}
                {!isHidden && record.client_handle ? <> · for {record.client_handle}</> : null}
              </p>
            </div>
            <StatusBadge status={record.status} mode={record.mode} revealed={Boolean(record.revealed_at)} />
          </div>

          {isHidden ? (
            <p className="mt-4 text-sm text-[var(--color-fog)]">
              This is an NDA seal. Only the commitment is on record — the contents are withheld
              until the worker reveals them. The seal still proves the work existed, sealed and
              unaltered, by its timestamp.
            </p>
          ) : (
            <>
              <p className="mt-4 whitespace-pre-wrap text-[var(--color-mist)]">{record.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {record.domain && <Pill>{record.domain}</Pill>}
                {record.scope && <Pill>{record.scope} scope</Pill>}
                {record.tags.map((t) => (
                  <Pill key={t}>{t}</Pill>
                ))}
              </div>
              {record.deliverable_ref && (
                <p className="mt-3 text-sm text-[var(--color-fog)]">
                  Deliverable: <span className="mono text-[var(--color-mist)]">{record.deliverable_ref}</span>
                </p>
              )}
              <div className="mt-4 flex gap-6 text-sm text-[var(--color-fog)]">
                <span>Start: {formatDate(record.start_date)}</span>
                <span>End: {formatDate(record.end_date)}</span>
              </div>
            </>
          )}
        </div>

        <div className="card p-6">
          <h2 className="mb-3 font-semibold text-white">Attestations ({attestations.length})</h2>
          {attestations.length === 0 ? (
            <p className="text-sm text-[var(--color-fog)]">
              No attestations yet — this is a one-party seal. The absence of an attestation is
              itself signal.
            </p>
          ) : (
            <ul className="space-y-3">
              {attestations.map((a) => (
                <li key={a.id} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-ink)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">@{a.attestor_handle}</span>
                    <span className="text-xs text-[var(--color-fog)]">
                      {a.kind === "machine" ? `machine · ${a.oracle}` : "human"} · {a.stake_hac} HAC
                    </span>
                  </div>
                  {a.note && <p className="mt-1 text-sm text-[var(--color-mist)]">{a.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {canAttest && <AttestPanel recordId={record.id} />}
        {!profile && !isHidden && (
          <p className="text-sm text-[var(--color-fog)]">
            <Link href="/login" className="text-[var(--color-ember)] hover:underline">
              Sign in
            </Link>{" "}
            to co-sign this record.
          </p>
        )}
      </div>

      {/* Proof sidebar */}
      <aside className="space-y-4">
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2 text-white">
            <Diamond size={16} />
            <h3 className="font-semibold">On-chain anchor</h3>
          </div>
          <dl className="space-y-2 text-sm">
            <Item label="Trust tier">
              <TrustBadge tier={record.trust_tier} />
            </Item>
            <Item label="Sealed">{formatDateTimeUTC(record.created_at)}</Item>
            <Item label="HACD">
              <span className="mono">{record.batch?.diamond ?? "pending"}</span>
            </Item>
            <Item label="Block">
              <span className="mono">{record.batch?.block_height?.toLocaleString() ?? "—"}</span>
            </Item>
            <Item label="Backend">
              <span className="mono">{record.batch?.backend ?? "—"}</span>
            </Item>
            <Item label="Commitment">
              <span className="mono text-xs">{shortHash(record.commitment, 8, 6)}</span>
            </Item>
          </dl>
          <div className="mt-4 flex flex-col gap-2">
            <Link href={`/verify/${record.commitment}`} className="btn btn-ghost w-full text-sm">
              Verify on chain
            </Link>
            <a href={`/api/records/${record.id}/receipt`} className="btn btn-ghost w-full text-sm">
              Download receipt
            </a>
          </div>
        </div>
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
