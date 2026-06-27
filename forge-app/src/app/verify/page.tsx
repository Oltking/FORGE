"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Diamond } from "@/components/Diamond";

export default function VerifySearchPage() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const v = value.trim().toLowerCase();
    if (/^[0-9a-f]{64}$/.test(v)) {
      router.push(`/verify/${v}`);
    }
  }

  const valid = /^[0-9a-f]{64}$/.test(value.trim().toLowerCase());

  return (
    <div className="mx-auto max-w-2xl pt-10">
      <div className="mb-6 flex items-center gap-2 text-white">
        <Diamond size={20} />
        <h1 className="text-2xl font-bold">Verify a record</h1>
      </div>
      <p className="mb-6 text-[var(--color-fog)]">
        Paste a commitment hash to check it against HACD — was it sealed, when, by whom, and
        is it unaltered. Verification runs against the chain, not against Forge.
      </p>
      <form onSubmit={go} className="space-y-3">
        <input
          className="input mono"
          placeholder="commitment hash (64 hex characters)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button type="submit" disabled={!valid} className="btn btn-ember w-full disabled:opacity-40">
          Verify on chain
        </button>
      </form>
    </div>
  );
}
