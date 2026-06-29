/**
 * A small "?" that explains a technical term in plain language on hover/focus.
 * Lets us keep accurate terms visible while never blocking a non-technical user.
 */
export function InfoHint({ children }: { children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label="What does this mean?"
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--color-line)] text-[0.6rem] text-[var(--color-fog)] hover:border-[var(--color-ember)] hover:text-[var(--color-ember)]"
      >
        ?
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel-2)] p-2.5 text-left text-xs font-normal leading-relaxed text-[var(--color-mist)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {children}
      </span>
    </span>
  );
}

/** A term shown with its plain-English hint attached. */
export function Term({ word, hint }: { word: string; hint: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap">
      {word}
      <InfoHint>{hint}</InfoHint>
    </span>
  );
}
