import { ok, handleError } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifyRecordByCommitment } from "@/lib/forge/verify";

export async function GET(_req: Request, ctx: { params: Promise<{ commitment: string }> }) {
  try {
    const { commitment } = await ctx.params;
    const db = await createSupabaseServerClient();
    const result = await verifyRecordByCommitment(db, commitment);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
