import type { NextRequest } from "next/server";
import { handleError, fail } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRecordById, getBatchById } from "@/lib/db/repo";
import { buildReceipt } from "@/lib/forge/receipt";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const db = await createSupabaseServerClient();
    const record = await getRecordById(db, id);
    if (!record) return fail("record not found", 404);

    const batch = record.batch_id ? await getBatchById(db, record.batch_id) : null;
    const baseUrl = new URL(req.url).origin;
    const receipt = buildReceipt(record, batch, baseUrl);

    return new Response(JSON.stringify(receipt, null, 2), {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="forge-receipt-${record.commitment.slice(0, 12)}.json"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
