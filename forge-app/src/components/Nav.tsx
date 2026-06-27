"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";
import { Diamond } from "./Diamond";

interface MeProfile {
  handle: string;
  display_name: string;
}

export function Nav() {
  const [me, setMe] = useState<MeProfile | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseBrowserClient();
    let active = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setSignedIn(Boolean(user));
      if (user) {
        const res = await fetch("/api/profile");
        const json = await res.json();
        if (active) setMe(json?.data?.profile ?? null);
      }
    }
    void load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => void load());
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setMe(null);
    setSignedIn(false);
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-[rgba(10,10,11,0.8)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-white">
          <Diamond size={20} />
          <span className="tracking-tight">Forge</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/explore" className="rounded-md px-3 py-1.5 text-[var(--color-mist)] hover:bg-[var(--color-panel-2)]">
            Explore
          </Link>
          <Link href="/verify" className="rounded-md px-3 py-1.5 text-[var(--color-mist)] hover:bg-[var(--color-panel-2)]">
            Verify
          </Link>
          <Link href="/seal" className="btn btn-ember ml-1 px-3 py-1.5 text-sm">
            Seal work
          </Link>
          {me ? (
            <div className="ml-1 flex items-center gap-1">
              <Link
                href={`/worker/${me.handle}`}
                className="rounded-md px-3 py-1.5 text-[var(--color-mist)] hover:bg-[var(--color-panel-2)]"
              >
                @{me.handle}
              </Link>
              <button onClick={signOut} className="rounded-md px-3 py-1.5 text-[var(--color-fog)] hover:bg-[var(--color-panel-2)]">
                Sign out
              </button>
            </div>
          ) : signedIn ? (
            <Link href="/onboard" className="btn btn-ghost ml-1 px-3 py-1.5 text-sm">
              Create profile
            </Link>
          ) : (
            <Link href="/login" className="btn btn-ghost ml-1 px-3 py-1.5 text-sm">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
