import { ok, handleError } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifyProofById } from "@/lib/forge/proof";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const db = await createSupabaseServerClient();
    const result = await verifyProofById(db, id);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
