import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { ConfigNotice } from "@/components/ConfigNotice";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listRecentProofs } from "@/lib/db/repo";
import { Diamond } from "@/components/Diamond";
import { Pill } from "@/components/badges";
import { formatDate, shortHash } from "@/lib/format";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  ai_eval: "AI eval",
  priority: "Idea",
  forecast: "Forecast",
  work: "Build",
  generic: "Proof",
};

export default async function ProofsPage() {
  if (!isSupabaseConfigured()) return <ConfigNotice />;
  const db = await createSupabaseServerClient();
  const proofs = await listRecentProofs(db, 48);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Proofs</h1>
          <p className="mt-1 text-[var(--color-fog)]">
            Seal anything. Disclose what you choose, when you choose. Verifiable on HACD.
          </p>
        </div>
        <Link href="/proofs/new" className="btn btn-ember">
          Seal a proof
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {proofs.map((p) => {
          const disclosed = Object.keys(p.disclosed ?? {}).length;
          return (
            <Link key={p.id} href={`/proof/${p.id}`} className="card block p-4 hover:border-[var(--color-fog)]">
              <div className="flex items-start justify-between gap-2">
                <h3 className="truncate font-semibold text-white">{p.title}</h3>
                <Pill>{TYPE_LABEL[p.proof_type] ?? p.proof_type}</Pill>
              </div>
              <p className="mt-1 text-sm text-[var(--color-fog)]">
                {p.author ? `@${p.author.handle}` : "—"} ·{" "}
                {disclosed}/{p.field_keys.length} fields disclosed
              </p>
              <div className="mt-3 flex items-center justify-between border-t border-[var(--color-line)] pt-2.5 text-xs text-[var(--color-fog)]">
                <span className="mono flex items-center gap-1.5">
                  <Diamond size={12} />
                  {p.batch?.diamond ?? "pending"}
                </span>
                <span className="mono">{shortHash(p.root, 6, 6)}</span>
                <span>{formatDate(p.created_at)}</span>
              </div>
            </Link>
          );
        })}
        {proofs.length === 0 && (
          <div className="card p-8 text-center text-sm text-[var(--color-fog)] sm:col-span-2 lg:col-span-3">
            No proofs yet.{" "}
            <Link href="/proofs/new" className="text-[var(--color-ember)] hover:underline">
              Seal the first one →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
