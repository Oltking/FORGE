/**
 * Verification service — the public proof check.
 *
 * Given a record, independently confirm:
 *   1. Commitment integrity: the stored payload + salt reproduce the commitment
 *      (skipped for an unrevealed NDA seal, where the payload is intentionally
 *      absent).
 *   2. Inclusion: the commitment + Merkle proof reproduce the anchored batch root.
 *
 * This logic depends only on the crypto core and the stored proof — it does not
 * trust the database's status fields. It is the same computation a third party
 * would run against the chain.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyCommitment } from "../crypto/commitment";
import { verifyMerkleProof } from "../crypto/merkle";
import { getBatchById, getRecordWithRelations } from "../db/repo";
import type { AnchorBatch, WorkRecordWithRelations } from "../db/types";

export interface VerificationResult {
  found: boolean;
  commitmentValid: boolean | null; // null = not checkable (NDA, unrevealed)
  inclusionValid: boolean | null; // null = not yet anchored
  anchored: boolean;
  record: WorkRecordWithRelations | null;
  batch: AnchorBatch | null;
  notes: string[];
}

export async function verifyRecordById(
  db: SupabaseClient,
  recordId: string,
): Promise<VerificationResult> {
  const record = await getRecordWithRelations(db, recordId);
  return verifyResolved(db, record);
}

export async function verifyRecordByCommitment(
  db: SupabaseClient,
  commitment: string,
): Promise<VerificationResult> {
  const { data } = await db
    .from("work_records")
    .select("id")
    .eq("commitment", commitment.toLowerCase())
    .maybeSingle();
  if (!data) {
    return emptyResult(["No sealed record found for this commitment."]);
  }
  return verifyRecordById(db, data.id as string);
}

async function verifyResolved(
  db: SupabaseClient,
  record: WorkRecordWithRelations | null,
): Promise<VerificationResult> {
  if (!record) return emptyResult(["Record not found."]);

  const notes: string[] = [];

  // 1. Commitment integrity
  let commitmentValid: boolean | null = null;
  if (record.payload && record.salt) {
    commitmentValid = await verifyCommitment(
      record.payload as never,
      record.salt,
      record.commitment,
    );
    notes.push(
      commitmentValid
        ? "Commitment reproduces from the revealed payload + salt."
        : "Commitment does NOT match the stored payload + salt.",
    );
  } else {
    notes.push("NDA seal — payload withheld until reveal; commitment integrity not checkable yet.");
  }

  // 2. Inclusion in an anchored batch
  let inclusionValid: boolean | null = null;
  let batch: AnchorBatch | null = record.batch ?? null;
  if (record.batch_id && !batch) {
    batch = await getBatchById(db, record.batch_id);
  }
  if (batch && record.merkle_proof) {
    inclusionValid = await verifyMerkleProof(record.commitment, record.merkle_proof, batch.root);
    notes.push(
      inclusionValid
        ? `Included in anchored batch (root ${batch.root.slice(0, 16)}…, ${batch.backend}).`
        : "Merkle proof does NOT reproduce the anchored root.",
    );
  } else {
    notes.push("Not yet anchored — pending the next batch inscription.");
  }

  return {
    found: true,
    commitmentValid,
    inclusionValid,
    anchored: Boolean(batch),
    record,
    batch,
    notes,
  };
}

function emptyResult(notes: string[]): VerificationResult {
  return {
    found: false,
    commitmentValid: null,
    inclusionValid: null,
    anchored: false,
    record: null,
    batch: null,
    notes,
  };
}
