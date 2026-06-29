"use client";

import { useState } from "react";
import { shortHash } from "@/lib/format";

/**
 * A hash/identifier shown truncated, always copyable, optionally linked to a
 * public explorer. Falls back gracefully if the clipboard API is unavailable.
 */
export function CopyHash({
  value,
  href,
  full = false,
  mono = true,
}: {
  value: string;
  href?: string;
  full?: boolean;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const display = full ? value : shortHash(value, 8, 6);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className={`${mono ? "mono" : ""} text-[var(--color-ember)] hover:underline`}
          title="View on explorer"
        >
          {display}
        </a>
      ) : (
        <span className={`${mono ? "mono" : ""} text-[var(--color-mist)]`}>{display}</span>
      )}
      <button
        onClick={copy}
        title={copied ? "Copied" : "Copy"}
        aria-label="Copy to clipboard"
        className="inline-flex h-5 w-5 items-center justify-center rounded border border-[var(--color-line)] text-[0.65rem] text-[var(--color-fog)] transition-colors hover:border-[var(--color-ember)] hover:text-[var(--color-ember)]"
      >
        {copied ? "✓" : "⧉"}
      </button>
    </span>
  );
}
