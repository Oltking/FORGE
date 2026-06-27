/**
 * Seal receipt — the portable, self-contained proof a worker exports and owns.
 *
 * Given a receipt, anyone can verify the seal without Forge: recompute the
 * commitment from {payload, salt}, then check the Merkle proof against the
 * anchored root. The receipt is the credential.
 */

import type { MerkleProofStep, WorkRecord, AnchorBatch } from "../db/types";

export interface ForgeReceipt {
  forge_receipt: "v1";
  record_id: string;
  commitment: string;
  mode: "public" | "nda";
  payload: Record<string, unknown> | null;
  salt: string | null;
  anchor: {
    backend: string;
    diamond: string;
    root: string;
    tx_hash: string | null;
    block_height: number | null;
    status: string;
    anchored_at: string | null;
  } | null;
  merkle_proof: MerkleProofStep[] | null;
  leaf_index: number | null;
  verify_url: string;
}

export function buildReceipt(
  record: WorkRecord,
  batch: AnchorBatch | null,
  baseUrl: string,
): ForgeReceipt {
  return {
    forge_receipt: "v1",
    record_id: record.id,
    commitment: record.commitment,
    mode: record.mode,
    payload: record.payload,
    salt: record.salt,
    anchor: batch
      ? {
          backend: batch.backend,
          diamond: batch.diamond,
          root: batch.root,
          tx_hash: batch.tx_hash,
          block_height: batch.block_height,
          status: batch.status,
          anchored_at: batch.anchored_at,
        }
      : null,
    merkle_proof: record.merkle_proof,
    leaf_index: record.leaf_index,
    verify_url: `${baseUrl.replace(/\/$/, "")}/verify/${record.commitment}`,
  };
}
