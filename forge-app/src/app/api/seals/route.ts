import type { NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth";
import { ok, fail, handleError } from "@/lib/api";
import { createSealSchema } from "@/lib/forge/schema";
import { createNdaSeal, createPublicSeal } from "@/lib/forge/seal";

export async function POST(req: NextRequest) {
  try {
    const { db, profile } = await requireProfile();
    const body = createSealSchema.parse(await req.json());

    if (body.mode === "public") {
      const record = await createPublicSeal(db, profile, body.payload, body.salt, body.commitment);
      return ok({ record }, 201);
    }
    const record = await createNdaSeal(db, profile, body.commitment);
    return ok({ record }, 201);
  } catch (err) {
    return handleError(err);
  }
}

export function GET() {
  return fail("Use POST to create a seal", 405);
}
