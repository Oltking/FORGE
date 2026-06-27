import type { NextRequest } from "next/server";
import { ok, fail, handleError } from "@/lib/api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { anchorPending } from "@/lib/forge/anchor";

/**
 * Run a batch anchoring pass. This is a system job: it uses the service role to
 * read every pending seal across users, build one Merkle root, anchor it, and
 * attach proofs. Protect it with ANCHOR_CRON_SECRET in production (sent as
 * `x-anchor-secret` or `Authorization: Bearer`).
 */
export async function POST(req: NextRequest) {
  try {
    const secret = process.env.ANCHOR_CRON_SECRET;
    if (secret) {
      const provided =
        req.headers.get("x-anchor-secret") ??
        req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
      if (provided !== secret) return fail("unauthorized", 401);
    }

    const db = createSupabaseAdminClient();
    const result = await anchorPending(db);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
