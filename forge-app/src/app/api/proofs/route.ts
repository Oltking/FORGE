import type { NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";
import { createProofSchema } from "@/lib/forge/schema";
import { createProofRecord } from "@/lib/forge/proof";

export async function POST(req: NextRequest) {
  try {
    const { db, profile } = await requireProfile();
    const body = createProofSchema.parse(await req.json());
    const proof = await createProofRecord(db, profile.id, body);
    return ok({ proof }, 201);
  } catch (err) {
    return handleError(err);
  }
}
