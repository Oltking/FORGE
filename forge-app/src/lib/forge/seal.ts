/**
 * Seal service — create a sealed work record (Layer 0).
 *
 * Public seals carry the full payload (it's public) and the server re-verifies
 * the commitment before storing. NDA seals store only the commitment — the
 * plaintext + salt never reach the server; the worker keeps them and reveals
 * later.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyCommitment } from "../crypto/commitment";
import { createRecord } from "../db/repo";
import type { Profile, WorkRecord } from "../db/types";
import type { WorkPayloadInput } from "./schema";

export class SealError extends Error {}

export async function createPublicSeal(
  db: SupabaseClient,
  worker: Profile,
  payload: WorkPayloadInput,
  salt: string,
  commitment: string,
): Promise<WorkRecord> {
  if (payload.worker !== worker.handle) {
    throw new SealError("payload.worker must match the authenticated handle");
  }
  if (payload.worker_type !== worker.kind) {
    throw new SealError("payload.worker_type must match the profile kind");
  }
  const ok = await verifyCommitment(payload, salt, commitment);
  if (!ok) {
    throw new SealError("commitment does not match payload + salt");
  }

  return createRecord(db, {
    worker_id: worker.id,
    record_type: payload.record_type ?? "work",
    title: payload.title,
    description: payload.description,
    client_handle: payload.client,
    domain: payload.domain,
    scope: payload.scope,
    start_date: payload.start_date,
    end_date: payload.end_date,
    deliverable_ref: payload.deliverable_ref ?? "",
    tags: payload.tags ?? [],
    mode: "public",
    payload,
    salt,
    commitment: commitment.toLowerCase(),
    status: "sealed",
    trust_tier: "self",
  });
}

export async function createNdaSeal(
  db: SupabaseClient,
  worker: Profile,
  commitment: string,
): Promise<WorkRecord> {
  return createRecord(db, {
    worker_id: worker.id,
    mode: "nda",
    commitment: commitment.toLowerCase(),
    status: "sealed",
    trust_tier: "self",
    tags: [],
    deliverable_ref: "",
  });
}

/**
 * Reveal an NDA seal: the worker submits the original payload + salt; we verify
 * it reproduces the stored commitment, then populate the record and mark it
 * revealed. The commitment is unchanged, so the anchored proof still holds.
 */
export async function revealNdaSeal(
  db: SupabaseClient,
  record: WorkRecord,
  payload: WorkPayloadInput,
  salt: string,
): Promise<WorkRecord> {
  if (record.mode !== "nda") throw new SealError("record is not an NDA seal");
  if (record.revealed_at) throw new SealError("record already revealed");

  const ok = await verifyCommitment(payload, salt, record.commitment);
  if (!ok) {
    throw new SealError("reveal failed: payload + salt do not match the sealed commitment");
  }

  const { updateRecord } = await import("../db/repo");
  return updateRecord(db, record.id, {
    title: payload.title,
    description: payload.description,
    client_handle: payload.client,
    domain: payload.domain,
    scope: payload.scope,
    start_date: payload.start_date,
    end_date: payload.end_date,
    deliverable_ref: payload.deliverable_ref ?? "",
    tags: payload.tags ?? [],
    payload,
    salt,
    revealed_at: new Date().toISOString(),
  });
}
