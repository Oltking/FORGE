import type { NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";
import { attestSchema } from "@/lib/forge/schema";
import { attestRecord } from "@/lib/forge/attest";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { db, profile } = await requireProfile();
    const { id } = await ctx.params;
    const body = attestSchema.parse(await req.json());
    const result = await attestRecord(db, id, profile, body);
    return ok(result, 201);
  } catch (err) {
    return handleError(err);
  }
}
