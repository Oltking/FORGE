import type { NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/api";
import { revealSchema } from "@/lib/forge/schema";
import { revealNdaSeal } from "@/lib/forge/seal";
import { getRecordById } from "@/lib/db/repo";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { db, profile } = await requireProfile();
    const { id } = await ctx.params;
    const record = await getRecordById(db, id);
    if (!record) return fail("record not found", 404);
    if (record.worker_id !== profile.id) return fail("not your record", 403);

    const body = revealSchema.parse(await req.json());
    const updated = await revealNdaSeal(db, record, body.payload, body.salt);
    return ok({ record: updated });
  } catch (err) {
    return handleError(err);
  }
}
