import Link from "next/link";
import { loadFeed } from "@/lib/page-data";
import { RecordCard } from "@/components/RecordCard";
import { Diamond } from "@/components/Diamond";

export const dynamic = "force-dynamic";

const TIERS = [
  {
    title: "Self-attested",
    body: "You seal a record. Timestamped, un-backdatable. The starting point.",
    color: "#9ca3af",
  },
  {
    title: "Human-attested",
    body: "Your client co-signs. Both put real HAC behind it. Neither can deny it.",
    color: "#34d399",
  },
  {
    title: "Machine-attested",
    body: "An oracle verifies an objective fact: PR merged, contract deployed, tests passed.",
    color: "#60a5fa",
  },
];

export default async function HomePage() {
  const feed = await loadFeed(9);

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="pt-8 text-center">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-1 text-xs text-[var(--color-fog)]">
          <Diamond size={13} /> Proof of work, for work — on HACD
        </div>
        <h1 className="mx-auto max-w-3xl text-balance text-5xl font-bold leading-[1.05] tracking-tight text-white">
          Nothing you build should disappear.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--color-fog)]">
          Forge is a two-party work attestation protocol. Seal what you built, have your
          client co-sign it, and own a permanent credential anchored on HACD — that
          neither party can edit, delete, or deny.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Link href="/seal" className="btn btn-ember">
            Seal your work
          </Link>
          <Link href="/explore" className="btn btn-ghost">
            Explore records
          </Link>
        </div>
        <p className="mt-8 mono text-sm text-[var(--color-fog)]">
          Bitcoin proved PoW for money. HACD brings PoW to assets.{" "}
          <span className="text-[var(--color-ember)]">Forge brings PoW to work.</span>
        </p>
      </section>

      {/* Trust tiers */}
      <section className="grid gap-4 sm:grid-cols-3">
        {TIERS.map((t) => (
          <div key={t.title} className="card p-5">
            <div className="mb-2 h-1.5 w-10 rounded-full" style={{ background: t.color }} />
            <h3 className="font-semibold text-white">{t.title}</h3>
            <p className="mt-1.5 text-sm text-[var(--color-fog)]">{t.body}</p>
          </div>
        ))}
      </section>

      {/* Feed */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recently sealed</h2>
          <Link href="/explore" className="text-sm text-[var(--color-ember)] hover:underline">
            View all →
          </Link>
        </div>

        {feed === null ? (
          <EmptyFeed setup />
        ) : feed.length === 0 ? (
          <EmptyFeed />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {feed.map((r) => (
              <RecordCard key={r.id} record={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyFeed({ setup = false }: { setup?: boolean }) {
  return (
    <div className="card p-8 text-center text-sm text-[var(--color-fog)]">
      {setup ? (
        <>
          Connect a Supabase project and run <span className="mono">npm run seed</span> to
          populate the feed.
        </>
      ) : (
        <>
          No records yet.{" "}
          <Link href="/seal" className="text-[var(--color-ember)] hover:underline">
            Seal the first one →
          </Link>
        </>
      )}
    </div>
  );
}
