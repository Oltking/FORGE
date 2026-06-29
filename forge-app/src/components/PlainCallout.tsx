/** A friendly, plain-language highlight box. */
export function PlainCallout({
  icon = "💡",
  children,
  tone = "neutral",
}: {
  icon?: string;
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn";
}) {
  const border =
    tone === "good"
      ? "rgba(52,211,153,0.4)"
      : tone === "warn"
        ? "rgba(245,158,11,0.4)"
        : "var(--color-line)";
  const bg =
    tone === "good"
      ? "rgba(52,211,153,0.06)"
      : tone === "warn"
        ? "rgba(245,158,11,0.06)"
        : "var(--color-ink)";
  return (
    <div className="flex gap-3 rounded-lg border p-3 text-sm" style={{ borderColor: border, background: bg }}>
      <span className="text-base leading-none">{icon}</span>
      <div className="text-[var(--color-mist)]">{children}</div>
    </div>
  );
}
