"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Diamond } from "@/components/Diamond";

export default function OnboardPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [domains, setDomains] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profile");
      const json = await res.json();
      if (json?.data?.profile) router.push(`/worker/${json.data.profile.handle}`);
      else if (!json?.data?.signedIn) router.push("/login");
    })();
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          handle,
          display_name: displayName,
          bio,
          domains: domains.split(",").map((d) => d.trim()).filter(Boolean),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create profile");
      router.push(`/worker/${json.data.profile.handle}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md pt-12">
      <div className="mb-6 text-center">
        <Diamond size={28} className="mx-auto" />
        <h1 className="mt-3 text-2xl font-bold text-white">Create your Forge profile</h1>
        <p className="mt-1 text-sm text-[var(--color-fog)]">This is the identity your sealed work is attributed to.</p>
      </div>
      <form onSubmit={submit} className="card space-y-4 p-6">
        <div>
          <label className="label">Handle</label>
          <input className="input mono" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="mira.eth" required />
        </div>
        <div>
          <label className="label">Display name</label>
          <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Mira" required />
        </div>
        <div>
          <label className="label">Bio</label>
          <textarea className="input" rows={2} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div>
          <label className="label">Domains (comma separated)</label>
          <input className="input" value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="Smart Contracts, Rust" />
        </div>
        {error && <p style={{ color: "#f87171" }} className="text-sm">{error}</p>}
        <button type="submit" disabled={busy} className="btn btn-ember w-full disabled:opacity-50">
          {busy ? "Creating…" : "Create profile"}
        </button>
      </form>
    </div>
  );
}
