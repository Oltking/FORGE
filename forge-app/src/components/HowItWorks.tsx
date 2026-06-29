const STEPS = [
  {
    n: "1",
    title: "Seal it",
    body: "Lock in your info — a result, an idea, your work. Once sealed, it can't be changed or back-dated. You can keep it private.",
    icon: "🔒",
  },
  {
    n: "2",
    title: "Save it forever",
    body: "Forge writes a tamper-proof fingerprint to a public record that nobody — not even us — can edit or delete.",
    icon: "💎",
  },
  {
    n: "3",
    title: "Prove it",
    body: "Later, reveal only the parts you choose. Anyone can check it's genuine and that you had it all along.",
    icon: "✅",
  },
];

export function HowItWorks() {
  return (
    <section>
      <h2 className="mb-1 text-center text-lg font-semibold text-white">How Forge works</h2>
      <p className="mb-6 text-center text-sm text-[var(--color-fog)]">
        No crypto knowledge needed — we handle the technical part.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="card p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xl">{s.icon}</span>
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-fog)]">
                Step {s.n}
              </span>
            </div>
            <h3 className="font-semibold text-white">{s.title}</h3>
            <p className="mt-1.5 text-sm text-[var(--color-fog)]">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
