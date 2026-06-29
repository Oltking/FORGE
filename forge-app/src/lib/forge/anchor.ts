/**
 * Anchoring service — batch pending seals into one Merkle root and anchor it.
 *
 * Collects every unanchored work record and forge contract, builds a single
 * Merkle tree over their commitments, anchors the root (Hacash or local), then
 * writes the batch and each item's Merkle proof back. After this, every item's
 * inclusion is independently verifiable against the anchored root forever.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildMerkleProof, buildMerkleTree } from "../crypto/merkle";
import { getAnchorProvider, type AnchorProvider } from "../hacash";
import { createBatch } from "../db/repo";
import type { AnchorBatch } from "../db/types";

interface Anchorable {
  table: "work_records" | "forge_contracts" | "proofs";
  id: string;
  commitment: string;
}

export interface AnchorRunResult {
  anchored: number;
  batch: AnchorBatch | null;
  message: string;
}

export async function anchorPending(
  db: SupabaseClient,
  provider: AnchorProvider = getAnchorProvider(),
): Promise<AnchorRunResult> {
  const items = await collectAnchorable(db);
  if (items.length === 0) {
    return { anchored: 0, batch: null, message: "Nothing to anchor." };
  }

  const commitments = items.map((i) => i.commitment);
  const tree = await buildMerkleTree(commitments);

  const receipt = await provider.anchorRoot(tree.root);

  const batch = await createBatch(db, {
    root: receipt.root,
    backend: receipt.backend,
    status: receipt.status,
    diamond: receipt.diamond,
    tx_hash: receipt.txHash,
    block_height: receipt.blockHeight,
    size: items.length,
    detail: receipt.detail ?? null,
    anchored_at: receipt.anchoredAt,
  });

  for (let i = 0; i < items.length; i++) {
    const proof = await buildMerkleProof(commitments, i);
    const { error } = await db
      .from(items[i].table)
      .update({ batch_id: batch.id, leaf_index: i, merkle_proof: proof })
      .eq("id", items[i].id);
    if (error) throw new Error(`anchorPending: attach proof failed: ${error.message}`);
  }

  return {
    anchored: items.length,
    batch,
    message: `Anchored ${items.length} item(s) under root ${receipt.root.slice(0, 16)}… (${receipt.backend}).`,
  };
}

async function collectAnchorable(db: SupabaseClient): Promise<Anchorable[]> {
  const items: Anchorable[] = [];

  const { data: records, error: rErr } = await db
    .from("work_records")
    .select("id, commitment")
    .is("batch_id", null)
    .order("created_at", { ascending: true });
  if (rErr) throw new Error(`collectAnchorable(records): ${rErr.message}`);
  for (const r of records ?? []) {
    items.push({ table: "work_records", id: r.id as string, commitment: r.commitment as string });
  }

  const { data: contracts, error: cErr } = await db
    .from("forge_contracts")
    .select("id, commitment")
    .is("batch_id", null)
    .order("created_at", { ascending: true });
  if (cErr) throw new Error(`collectAnchorable(contracts): ${cErr.message}`);
  for (const c of contracts ?? []) {
    items.push({ table: "forge_contracts", id: c.id as string, commitment: c.commitment as string });
  }

  // Proofs anchor by their selective-disclosure root.
  const { data: proofs, error: pErr } = await db
    .from("proofs")
    .select("id, root")
    .is("batch_id", null)
    .order("created_at", { ascending: true });
  if (pErr) throw new Error(`collectAnchorable(proofs): ${pErr.message}`);
  for (const p of proofs ?? []) {
    items.push({ table: "proofs", id: p.id as string, commitment: p.root as string });
  }

  return items;
}
