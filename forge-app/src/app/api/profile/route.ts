import type { NextRequest } from "next/server";
import { ok, fail, handleError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { createProfileSchema } from "@/lib/forge/schema";
import { createProfile, getProfileByHandle } from "@/lib/db/repo";

export async function GET() {
  try {
    const { userId, profile } = await getSession();
    return ok({ profile, signedIn: Boolean(userId) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { db, userId, profile } = await getSession();
    if (!userId) return fail("not signed in", 401);
    if (profile) return fail("profile already exists", 409);

    const body = createProfileSchema.parse(await req.json());
    const existing = await getProfileByHandle(db, body.handle);
    if (existing) return fail("handle already taken", 409);

    const created = await createProfile(db, {
      user_id: userId,
      handle: body.handle,
      display_name: body.display_name,
      kind: "human",
      bio: body.bio,
      domains: body.domains,
    });
    return ok({ profile: created }, 201);
  } catch (err) {
    return handleError(err);
  }
}
