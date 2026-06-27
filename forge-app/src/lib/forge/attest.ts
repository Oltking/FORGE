/**
 * Attestation service — the mutual stake.
 *
 * A client co-signs a worker's record (human attestation) or an oracle confirms
 * an objective fact (machine attestation). Adding an attestation upgrades the
 * record's trust tier (self -> human, and -> machine when oracle-verified) and
 * flips its status to "attested".
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAttestation, getRecordById, listAttestationsByRecord, updateRecord } from "../db/repo";
import type { Attestation, OracleKind, Profile, TrustTier } from "../db/types";

export class AttestError extends Error {}

export interface AttestInput {
  note?: string;
  stake_hac?: number;
  oracle?: OracleKind;
  oracle_ref?: string;
}

export async function attestRecord(
  db: SupabaseClient,
  recordId: string,
  attestor: Profile,
  input: AttestInput,
): Promise<{ attestation: Attestation; trustTier: TrustTier }> {
  const record = await getRecordById(db, recordId);
  if (!record) throw new AttestError("record not found");
  if (record.mode === "nda" && !record.revealed_at) {
    throw new AttestError("cannot attest an NDA seal before it is revealed");
  }
  if (record.worker_id === attestor.id) {
    throw new AttestError("a worker cannot attest their own record");
  }

  const kind = input.oracle ? "machine" : "human";

  const attestation = await createAttestation(db, {
    record_id: recordId,
    kind,
    attestor_handle: attestor.handle,
    attestor_id: attestor.id,
    note: input.note ?? "",
    stake_hac: input.stake_hac ?? 0.01,
    oracle: input.oracle ?? null,
    oracle_ref: input.oracle_ref ?? null,
  });

  const all = await listAttestationsByRecord(db, recordId);
  const trustTier = highestTrustTier(all);
  await updateRecord(db, recordId, { status: "attested", trust_tier: trustTier });

  return { attestation, trustTier };
}

export function highestTrustTier(attestations: Attestation[]): TrustTier {
  if (attestations.some((a) => a.kind === "machine")) return "machine";
  if (attestations.some((a) => a.kind === "human")) return "human";
  return "self";
}
