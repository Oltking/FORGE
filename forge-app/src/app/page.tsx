import Link from "next/link";
import { loadFeed } from "@/lib/page-data";
import { RecordCard } from "@/components/RecordCard";
import { Diamond } from "@/components/Diamond";
import { HowItWorks } from "@/components/HowItWorks";

export const dynamic = "force-dynamic";

const EXAMPLES = [
  {
    icon: "🛠️",
    title: "Prove what you've built",
    body: "Seal the features, projects, and releases you shipped. A builder track record nobody can fake.",
    href: "/proofs/new",
  },
  {
    icon: "🌿",
    title: "Prove your open-source contributions",
    body: "Paste a GitHub PR or commit and seal it on the record. Build in public, provably yours.",
    href: "/proofs/new",
  },
  {
    icon: "💡",
    title: "Prove you had an idea first",
    body: "Seal an idea, design, or plan privately. If someone copies it later, prove you got there first.",
    href: "/proofs/new",
  },
  {
    icon: "📊",
    title: "Prove a result before you publish",
    body: "Lock in your numbers first. Later, prove you didn't change them to look better.",
    href: "/proofs/new",
  },
];

export default async function HomePage() {
  const feed = await loadFeed(6);

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="pt-8 text-center">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-1 text-xs text-[var(--color-fog)]">
          <Diamond size={13} /> Proof you can trust — without oversharing
        </div>
        <h1 className="mx-auto max-w-3xl text-balance text-5xl font-bold leading-[1.05] tracking-tight text-white">
          Prove it&apos;s true. Keep what&apos;s private, private.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--color-fog)]">
          Forge lets you prove something is real — a result, an idea, your work — without revealing
          the private details. Once it&apos;s sealed, nobody can fake it, change it, or back-date it.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          <Link href="/proofs/new" className="btn btn-ember">
            Seal a proof
          </Link>
          <Link href="/proofs" className="btn btn-ghost">
            See examples
          </Link>
        </div>
      </section>

      <HowItWorks />

      {/* What can you prove */}
      <section>
        <h2 className="mb-6 text-center text-lg font-semibold text-white">What can you prove?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {EXAMPLES.map((e) => (
            <Link key={e.title} href={e.href} className="card flex gap-4 p-5 hover:border-[var(--color-fog)]">
              <span className="text-2xl">{e.icon}</span>
              <div>
                <h3 className="font-semibold text-white">{e.title}</h3>
                <p className="mt-1 text-sm text-[var(--color-fog)]">{e.body}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      {feed && feed.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recently on Forge</h2>
            <Link href="/explore" className="text-sm text-[var(--color-ember)] hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {feed.map((r) => (
              <RecordCard key={r.id} record={r} />
            ))}
          </div>
        </section>
      )}

      {/* Closing line */}
      <section className="border-t border-[var(--color-line)] pt-8 text-center">
        <p className="mono text-sm text-[var(--color-fog)]">
          Built on Hacash — a permanent public record no single company controls.
        </p>
      </section>
    </div>
  );
}
