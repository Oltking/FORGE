import Link from "next/link";
import { loadFeed, loadProfiles } from "@/lib/page-data";
import { RecordCard } from "@/components/RecordCard";
import { ConfigNotice } from "@/components/ConfigNotice";
import { ForgeScoreRing } from "@/components/ForgeScore";
import { computeForgeScore } from "@/lib/forge/score";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listAttestationsByRecord, listRecordsByWorker } from "@/lib/db/repo";
import { isSupabaseConfigured } from "@/lib/env";
import type { Attestation } from "@/lib/db/types";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  if (!isSupabaseConfigured()) return <ConfigNotice />;

  const [feed, profiles] = await Promise.all([loadFeed(48), loadProfiles()]);
  const db = await createSupabaseServerClient();

  const ranked = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const records = await listRecordsByWorker(db, p.id);
      const attestationsByRecord = new Map<string, Attestation[]>();
      for (const r of records) {
        attestationsByRecord.set(r.id, await listAttestationsByRecord(db, r.id));
      }
      const score = computeForgeScore({ records, attestationsByRecord });
      return { profile: p, score: score.score, count: records.length };
    }),
  );
  ranked.sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Explore Forge</h1>
        <p className="mt-1 text-[var(--color-fog)]">
          Every record is a two-party stake anchored on HACD. Reputation is earned, never
          self-reported.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-fog)]">
          Leaderboard
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ranked.map(({ profile, score, count }) => (
            <Link key={profile.id} href={`/worker/${profile.handle}`} className="card flex items-center gap-4 p-4 hover:border-[var(--color-fog)]">
              <ForgeScoreRing score={score} size={64} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{profile.display_name}</p>
                <p className="truncate text-sm text-[var(--color-fog)]">
                  @{profile.handle} · {profile.kind === "agent" ? "AI agent" : "human"}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-fog)]">{count} records sealed</p>
              </div>
            </Link>
          ))}
          {ranked.length === 0 && (
            <p className="text-sm text-[var(--color-fog)]">No profiles yet.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-fog)]">
          All records
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(feed ?? []).map((r) => (
            <RecordCard key={r.id} record={r} />
          ))}
          {(feed ?? []).length === 0 && (
            <p className="text-sm text-[var(--color-fog)]">No records yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
