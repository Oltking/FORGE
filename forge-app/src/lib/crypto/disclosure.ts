/**
 * Field-level selective disclosure.
 *
 * The core new primitive of the proof engine. A structured payload is sealed by
 * committing to each field *independently* (own salt), then Merkle-batching those
 * field-commitments under one root. Only the root is anchored on HACD.
 *
 * Later, the holder can disclose an arbitrary *subset* of fields: for each, they
 * reveal {key, value, salt} plus a Merkle proof. A verifier recomputes the field
 * commitment and checks it against the anchored root. Undisclosed fields stay
 * hidden — only their commitments exist in the tree, never their values, and the
 * per-field salt stops a verifier brute-forcing low-entropy values.
 *
 * This delivers "reveal these fields, keep those sealed" without any ZK. It does
 * NOT yet deliver threshold proofs ("value >= X without revealing X") — that is a
 * later ZK milestone and is intentionally not claimed here.
 *
 * Fields are ordered canonically (by key) so the tree is deterministic and any
 * party reconstructs the same indices.
 */

import { canonicalize, type CanonicalValue } from "./canonical";
import { randomSalt, sha256Hex, utf8 } from "./hash";
import { buildMerkleProof, buildMerkleTree, verifyMerkleProof, type MerkleProof } from "./merkle";

export const FIELD_DOMAIN = "forge.field.v1";

export type FieldMap = Record<string, CanonicalValue>;

/** A single field's secret material + its commitment, kept by the holder. */
export interface SealedField {
  key: string;
  value: CanonicalValue;
  salt: string;
  commitment: string;
  index: number; // position in the canonical (sorted-key) order
}

export interface SealedProof {
  root: string;
  /** Full opening material for every field — the holder keeps this private. */
  fields: SealedField[];
}

/** What a holder hands a verifier to prove one disclosed field. */
export interface FieldOpening {
  key: string;
  value: CanonicalValue;
  salt: string;
  proof: MerkleProof;
}

/** Commit to one field, binding key+value together (so a value can't be re-keyed). */
export async function fieldCommitment(
  key: string,
  value: CanonicalValue,
  salt: string,
): Promise<string> {
  if (!salt || salt.length < 16) {
    throw new Error("fieldCommitment: salt must be at least 16 hex chars");
  }
  const preimage = utf8(`${FIELD_DOMAIN}|${canonicalize([key, value])}|${salt}`);
  return sha256Hex(preimage);
}

/** Seal a structured payload: per-field commitments under one Merkle root. */
export async function sealFields(payload: FieldMap): Promise<SealedProof> {
  const keys = Object.keys(payload).sort();
  if (keys.length === 0) throw new Error("sealFields: payload has no fields");

  const fields: SealedField[] = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const salt = randomSalt();
    const commitment = await fieldCommitment(key, payload[key], salt);
    fields.push({ key, value: payload[key], salt, commitment, index: i });
  }

  const tree = await buildMerkleTree(fields.map((f) => f.commitment));
  return { root: tree.root, fields };
}

/** Produce openings for a chosen subset of fields. */
export async function discloseFields(
  sealed: SealedProof,
  keysToReveal: string[],
): Promise<FieldOpening[]> {
  const commitments = sealed.fields.map((f) => f.commitment);
  const openings: FieldOpening[] = [];

  for (const key of keysToReveal) {
    const field = sealed.fields.find((f) => f.key === key);
    if (!field) throw new Error(`discloseFields: unknown field "${key}"`);
    const proof = await buildMerkleProof(commitments, field.index);
    openings.push({ key: field.key, value: field.value, salt: field.salt, proof });
  }

  return openings;
}

export interface DisclosureResult {
  ok: boolean;
  fields: { key: string; valid: boolean }[];
}

/** Verify disclosed fields against an anchored root. Undisclosed fields stay hidden. */
export async function verifyDisclosure(
  root: string,
  openings: FieldOpening[],
): Promise<DisclosureResult> {
  const fields: { key: string; valid: boolean }[] = [];
  for (const o of openings) {
    const commitment = await fieldCommitment(o.key, o.value, o.salt);
    const valid = await verifyMerkleProof(commitment, o.proof, root);
    fields.push({ key: o.key, valid });
  }
  return { ok: fields.length > 0 && fields.every((f) => f.valid), fields };
}
