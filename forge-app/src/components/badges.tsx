import type { RecordStatus, TrustTier, RecordMode } from "@/lib/db/types";

const TRUST_STYLES: Record<TrustTier, { label: string; bg: string; fg: string }> = {
  self: { label: "Self-attested", bg: "rgba(107,114,128,0.15)", fg: "#9ca3af" },
  human: { label: "Human-attested", bg: "rgba(52,211,153,0.14)", fg: "#34d399" },
  machine: { label: "Machine-attested", bg: "rgba(96,165,250,0.14)", fg: "#60a5fa" },
};

export function TrustBadge({ tier }: { tier: TrustTier }) {
  const s = TRUST_STYLES[tier];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

const STATUS_STYLES: Record<string, { label: string; bg: string; fg: string }> = {
  attested: { label: "Attested", bg: "rgba(52,211,153,0.14)", fg: "#34d399" },
  sealed: { label: "Sealed", bg: "rgba(245,158,11,0.14)", fg: "#f59e0b" },
  disputed: { label: "Disputed", bg: "rgba(248,113,113,0.14)", fg: "#f87171" },
  nda: { label: "NDA — sealed", bg: "rgba(107,114,128,0.14)", fg: "#9ca3af" },
};

export function StatusBadge({
  status,
  mode,
  revealed,
}: {
  status: RecordStatus;
  mode?: RecordMode;
  revealed?: boolean;
}) {
  const key = mode === "nda" && !revealed ? "nda" : status;
  const s = STATUS_STYLES[key] ?? STATUS_STYLES.sealed;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel-2)] px-2.5 py-0.5 text-xs text-[var(--color-fog)]">
      {children}
    </span>
  );
}
