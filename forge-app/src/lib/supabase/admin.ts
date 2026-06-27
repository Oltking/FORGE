/**
 * Service-role Supabase client — server only.
 *
 * Bypasses RLS. Used for orchestration the user cannot do directly: writing
 * anchor batches, attaching Merkle proofs to records, and seeding. Never import
 * this into client code.
 */

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requirePublicEnv, requireServiceRoleKey } from "../env";

export function createSupabaseAdminClient() {
  const { supabaseUrl } = requirePublicEnv();
  const serviceRoleKey = requireServiceRoleKey();
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
