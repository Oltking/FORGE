import Link from "next/link";
import type { WorkRecordWithRelations } from "@/lib/db/types";
import { StatusBadge, TrustBadge, Pill } from "./badges";
import { Diamond } from "./Diamond";
import { formatDate, shortHash } from "@/lib/format";

export function RecordCard({ record }: { record: WorkRecordWithRelations }) {
  const isHidden = record.mode === "nda" && !record.revealed_at;
  const worker = record.worker;

  return (
    <Link
      href={`/record/${record.id}`}
      className="card block p-4 transition-colors hover:border-[var(--color-fog)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-white">
            {isHidden ? "Sealed record (NDA)" : record.title}
          </h3>
          <p className="mt-0.5 text-sm text-[var(--color-fog)]">
            {worker ? (
              <span className="text-[var(--color-mist)]">@{worker.handle}</span>
            ) : (
              "—"
            )}
            {!isHidden && record.client_handle ? (
              <>
                {" "}
                · {record.record_type === "teaching" ? "taught" : "for"}{" "}
                <span className="text-[var(--color-mist)]">{record.client_handle}</span>
              </>
            ) : null}
          </p>
        </div>
        <StatusBadge status={record.status} mode={record.mode} revealed={Boolean(record.revealed_at)} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TrustBadge tier={record.trust_tier} />
        {record.record_type === "teaching" ? <Pill>Teaching</Pill> : null}
        {!isHidden && record.domain ? <Pill>{record.domain}</Pill> : null}
        {!isHidden && record.scope ? <Pill>{record.scope}</Pill> : null}
        {record.worker?.kind === "agent" ? <Pill>AI agent</Pill> : null}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-[var(--color-line)] pt-2.5 text-xs text-[var(--color-fog)]">
        <span className="mono flex items-center gap-1.5">
          <Diamond size={12} />
          {record.batch?.diamond ?? "pending anchor"}
        </span>
        <span className="mono">{shortHash(record.commitment, 6, 6)}</span>
        <span>{formatDate(record.created_at)}</span>
      </div>
    </Link>
  );
}
