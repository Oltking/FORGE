/**
 * Server-side page data loaders that degrade gracefully when Supabase is not
 * configured (so the app always boots and shows a setup notice instead of a
 * crash).
 */

import { isSupabaseConfigured } from "./env";
import { createSupabaseServerClient } from "./supabase/server";
import {
  getProfileByHandle,
  listAttestationsByRecord,
  listProfiles,
  listRecentRecords,
  listRecordsByWorker,
  getRecordWithRelations,
} from "./db/repo";
import { computeForgeScore } from "./forge/score";
import type {
  Attestation,
  Profile,
  WorkRecord,
  WorkRecordWithRelations,
} from "./db/types";

export async function loadFeed(limit = 12): Promise<WorkRecordWithRelations[] | null> {
  if (!isSupabaseConfigured()) return null;
  const db = await createSupabaseServerClient();
  return listRecentRecords(db, limit);
}

export async function loadProfiles(): Promise<Profile[] | null> {
  if (!isSupabaseConfigured()) return null;
  const db = await createSupabaseServerClient();
  return listProfiles(db);
}

export interface WorkerPageData {
  profile: Profile;
  records: WorkRecord[];
  score: ReturnType<typeof computeForgeScore>;
  attestationsByRecord: Map<string, Attestation[]>;
}

export async function loadWorker(handle: string): Promise<WorkerPageData | null | "unconfigured"> {
  if (!isSupabaseConfigured()) return "unconfigured";
  const db = await createSupabaseServerClient();
  const profile = await getProfileByHandle(db, handle);
  if (!profile) return null;

  const records = await listRecordsByWorker(db, profile.id);
  const attestationsByRecord = new Map<string, Attestation[]>();
  for (const r of records) {
    attestationsByRecord.set(r.id, await listAttestationsByRecord(db, r.id));
  }
  const score = computeForgeScore({ records, attestationsByRecord });
  return { profile, records, score, attestationsByRecord };
}

export async function loadRecord(id: string): Promise<WorkRecordWithRelations | null | "unconfigured"> {
  if (!isSupabaseConfigured()) return "unconfigured";
  const db = await createSupabaseServerClient();
  return getRecordWithRelations(db, id);
}
