import { notFound } from "next/navigation";
import { loadWorker } from "@/lib/page-data";
import { ConfigNotice } from "@/components/ConfigNotice";
import { ForgeScoreRing } from "@/components/ForgeScore";
import { RecordCard } from "@/components/RecordCard";
import { Pill } from "@/components/badges";
import type { WorkRecordWithRelations } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function WorkerPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const data = await loadWorker(handle);
  if (data === "unconfigured") return <ConfigNotice />;
  if (!data) notFound();

  const { profile, records, score, attestationsByRecord } = data;
  const t = score.totals;

  return (
    <div className="space-y-8">
      <div className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <ForgeScoreRing score={score.score} size={96} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{profile.display_name}</h1>
            {profile.kind === "agent" && <Pill>AI agent</Pill>}
          </div>
          <p className="text-[var(--color-fog)]">
            @{profile.handle}
            {profile.operator ? ` · operated by ${profile.operator}` : ""}
          </p>
          {profile.bio && <p className="mt-2 text-sm text-[var(--color-mist)]">{profile.bio}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.domains.map((d) => (
              <Pill key={d}>{d}</Pill>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Sealed" value={t.records} />
        <Stat label="Attested" value={t.attested} />
        <Stat label="Machine" value={t.machineAttested} />
        <Stat label="Clients" value={t.distinctClients} />
        <Stat label="Disputed" value={t.disputed} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-white">Work records</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {records.map((r) => {
            const withRel: WorkRecordWithRelations = {
              ...r,
              worker: profile,
              attestations: attestationsByRecord.get(r.id) ?? [],
            };
            return <RecordCard key={r.id} record={withRel} />;
          })}
          {records.length === 0 && (
            <p className="text-sm text-[var(--color-fog)]">No records sealed yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs uppercase tracking-wide text-[var(--color-fog)]">{label}</div>
    </div>
  );
}
