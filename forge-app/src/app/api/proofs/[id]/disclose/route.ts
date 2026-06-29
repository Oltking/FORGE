import type { NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/api";
import { discloseSchema } from "@/lib/forge/schema";
import { discloseProofFields } from "@/lib/forge/proof";
import { getProofById } from "@/lib/db/repo";
import type { FieldOpening } from "@/lib/crypto/disclosure";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { db, profile } = await requireProfile();
    const { id } = await ctx.params;
    const proof = await getProofById(db, id);
    if (!proof) return fail("proof not found", 404);
    if (proof.author_id !== profile.id) return fail("not your proof", 403);

    const body = discloseSchema.parse(await req.json());
    const openings = body.openings as FieldOpening[];
    const updated = await discloseProofFields(db, proof, openings);
    return ok({ proof: updated });
  } catch (err) {
    return handleError(err);
  }
}
