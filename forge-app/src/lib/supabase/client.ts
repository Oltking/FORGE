/** Browser-side Supabase client (singleton). */

"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requirePublicEnv } from "../env";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();
  client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}
