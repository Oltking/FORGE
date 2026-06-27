import { Diamond } from "./Diamond";

export function ConfigNotice() {
  return (
    <div className="card mx-auto mt-10 max-w-2xl p-6">
      <div className="flex items-center gap-2 text-white">
        <Diamond size={18} />
        <h2 className="text-lg font-semibold">Connect a database to go live</h2>
      </div>
      <p className="mt-3 text-sm text-[var(--color-fog)]">
        Forge is fully built. To run it end to end, point it at a Supabase project:
      </p>
      <ol className="mt-3 space-y-1.5 text-sm text-[var(--color-mist)]">
        <li>1. Create a free project at supabase.com</li>
        <li>2. Run the SQL in <span className="mono">supabase/migrations/0001_init.sql</span></li>
        <li>
          3. Copy <span className="mono">.env.example</span> to <span className="mono">.env.local</span> and
          fill the keys
        </li>
        <li>4. <span className="mono">npm run seed</span> then <span className="mono">npm run dev</span></li>
      </ol>
      <p className="mt-4 text-xs text-[var(--color-fog)]">
        The cryptographic core (commitments, Merkle proofs, verification) runs without any of this —
        see <span className="mono">npm test</span>.
      </p>
    </div>
  );
}
