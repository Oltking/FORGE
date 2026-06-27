"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { Diamond } from "@/components/Diamond";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const supabase = getSupabaseBrowserClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("Account created. If email confirmation is on, check your inbox; otherwise continue.");
        router.push("/onboard");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/onboard");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm pt-12">
      <div className="mb-6 text-center">
        <Diamond size={28} className="mx-auto" />
        <h1 className="mt-3 text-2xl font-bold text-white">
          {mode === "signin" ? "Sign in to Forge" : "Create your account"}
        </h1>
      </div>

      {!configured && (
        <p className="card mb-4 p-3 text-sm text-[var(--color-fog)]">
          Supabase is not configured yet. Set env vars to enable sign-in.
        </p>
      )}

      <form onSubmit={submit} className="card space-y-4 p-6">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        {error && <p style={{ color: "#f87171" }} className="text-sm">{error}</p>}
        {msg && <p className="text-sm text-[var(--color-green)]">{msg}</p>}
        <button type="submit" disabled={busy || !configured} className="btn btn-ember w-full disabled:opacity-50">
          {busy ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-4 w-full text-center text-sm text-[var(--color-fog)] hover:text-[var(--color-mist)]"
      >
        {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
      </button>
    </div>
  );
}
