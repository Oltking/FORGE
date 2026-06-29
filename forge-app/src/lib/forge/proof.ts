/**
 * Proof service — the generic proof engine.
 *
 * A proof seals a structured set of fields under one Merkle root (field-level
 * selective disclosure). The author seals client-side and keeps the opening
 * material; the server stores only the root + field names. Later the author
 * discloses chosen fields; the server verifies each opening against the root
 * before storing it, so anything public is provably consistent with what was
 * sealed. The root is anchored on HACD via the shared batch mechanism.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  verifyDisclosure,
  type FieldOpening,
} from "../crypto/disclosure";
import { verifyMerkleProof } from "../crypto/merkle";
import { createProof, getProofWithRelations, updateProof } from "../db/repo";
import type {
  Proof,
  ProofType,
  ProofVisibility,
  ProofWithRelations,
  StoredOpening,
} from "../db/types";

export class ProofError extends Error {}

export interface CreateProofInput {
  proof_type: ProofType;
  title: string;
  description?: string;
  root: string;
  field_keys: string[];
}

export async function createProofRecord(
  db: SupabaseClient,
  authorId: string,
  input: CreateProofInput,
): Promise<Proof> {
  if (!/^[0-9a-f]{64}$/i.test(input.root)) {
    throw new ProofError("root must be a 32-byte hex string");
  }
  if (input.field_keys.length === 0) {
    throw new ProofError("a proof must seal at least one field");
  }
  return createProof(db, {
    author_id: authorId,
    proof_type: input.proof_type,
    title: input.title,
    description: input.description ?? "",
    root: input.root.toLowerCase(),
    field_keys: [...input.field_keys].sort(),
    disclosed: {},
    visibility: "sealed",
  });
}

/**
 * Disclose a set of fields. Each opening is verified against the sealed root
 * before being stored, so the public record can never contain an opening that
 * doesn't reconcile with what was sealed.
 */
export async function discloseProofFields(
  db: SupabaseClient,
  proof: Proof,
  openings: FieldOpening[],
): Promise<Proof> {
  const result = await verifyDisclosure(proof.root, openings);
  if (!result.ok) {
    const bad = result.fields.filter((f) => !f.valid).map((f) => f.key);
    throw new ProofError(`disclosure failed for: ${bad.join(", ") || "(none provided)"}`);
  }

  const disclosed: Record<string, StoredOpening> = { ...proof.disclosed };
  for (const o of openings) {
    disclosed[o.key] = { value: o.value, salt: o.salt, proof: o.proof };
  }

  const disclosedCount = Object.keys(disclosed).length;
  const visibility: ProofVisibility =
    disclosedCount >= proof.field_keys.length ? "revealed" : "partial";

  return updateProof(db, proof.id, {
    disclosed,
    visibility,
    revealed_at: proof.revealed_at ?? new Date().toISOString(),
  });
}

export interface ProofVerification {
  found: boolean;
  anchored: boolean;
  inclusionValid: boolean | null;
  disclosedValid: boolean | null;
  disclosedFields: { key: string; valid: boolean }[];
  proof: ProofWithRelations | null;
  notes: string[];
}

export async function verifyProofById(
  db: SupabaseClient,
  id: string,
): Promise<ProofVerification> {
  const proof = await getProofWithRelations(db, id);
  if (!proof) {
    return {
      found: false,
      anchored: false,
      inclusionValid: null,
      disclosedValid: null,
      disclosedFields: [],
      proof: null,
      notes: ["Proof not found."],
    };
  }

  const notes: string[] = [];

  // 1. Anchoring: the proof root is a leaf of the anchored batch root.
  let inclusionValid: boolean | null = null;
  if (proof.batch && proof.merkle_proof) {
    inclusionValid = await verifyMerkleProof(proof.root, proof.merkle_proof, proof.batch.root);
    notes.push(
      inclusionValid
        ? `Root anchored in batch (${proof.batch.backend}, diamond ${proof.batch.diamond}).`
        : "Root does NOT reconcile with the anchored batch.",
    );
  } else {
    notes.push("Not yet anchored — pending the next batch.");
  }

  // 2. Disclosed fields reconcile with the sealed root.
  const disclosedEntries = Object.entries(proof.disclosed ?? {});
  let disclosedValid: boolean | null = null;
  const disclosedFields: { key: string; valid: boolean }[] = [];
  if (disclosedEntries.length > 0) {
    const openings: FieldOpening[] = disclosedEntries.map(([key, o]) => ({
      key,
      value: o.value as never,
      salt: o.salt,
      proof: o.proof,
    }));
    const res = await verifyDisclosure(proof.root, openings);
    disclosedValid = res.ok;
    disclosedFields.push(...res.fields);
    notes.push(
      res.ok
        ? `${res.fields.length} disclosed field(s) reconcile with the sealed root.`
        : "One or more disclosed fields do NOT reconcile with the sealed root.",
    );
  } else {
    notes.push("Sealed — no fields disclosed yet.");
  }

  return {
    found: true,
    anchored: Boolean(proof.batch),
    inclusionValid,
    disclosedValid,
    disclosedFields,
    proof,
    notes,
  };
}
