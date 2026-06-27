/**
 * Server auth helpers — resolve the current user and their Forge profile.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./supabase/server";
import { getProfileByUserId } from "./db/repo";
import type { Profile } from "./db/types";

export interface SessionContext {
  db: SupabaseClient;
  userId: string | null;
  profile: Profile | null;
}

export async function getSession(): Promise<SessionContext> {
  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) return { db, userId: null, profile: null };

  const profile = await getProfileByUserId(db, user.id);
  return { db, userId: user.id, profile };
}

export async function requireProfile(): Promise<{ db: SupabaseClient; profile: Profile }> {
  const { db, userId, profile } = await getSession();
  if (!userId) throw new AuthError("Not signed in", 401);
  if (!profile) throw new AuthError("No Forge profile — create one first", 403);
  return { db, profile };
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}
