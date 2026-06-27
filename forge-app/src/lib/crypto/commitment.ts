/**
 * Commitments — the cryptographic core of a Forge seal.
 *
 * A seal commits to a structured work record without necessarily revealing it.
 * The commitment is:
 *
 *     commitment = SHA256( DOMAIN_TAG ‖ canonical(payload) ‖ ":" ‖ salt )
 *
 * The domain tag prevents the commitment from being reinterpreted as a hash of
 * something else (domain separation). The salt hides low-entropy payloads until
 * reveal. Anyone holding {payload, salt} can recompute and verify the commitment
 * forever, with no server and no trust in Forge.
 */

import { canonicalize, type CanonicalValue } from "./canonical";
import { sha256Hex, utf8 } from "./hash";

export const COMMITMENT_DOMAIN = "forge.seal.v1";

export interface TeachingDetail extends Record<string, CanonicalValue> {
  level: "intro" | "intermediate" | "advanced";
  format: "1:1" | "cohort" | "async";
  /** Total teaching hours. */
  hours: number;
  /** What the student can now do — the verifiable outcome of the teaching. */
  outcome: string;
}

export interface WorkRecordPayload extends Record<string, CanonicalValue> {
  /** Schema/version marker for forward compatibility. */
  kind: "work_record";
  v: 1;
  /**
   * "work" = standard delivery (client co-signs).
   * "teaching" = a teaching/mentoring session (the student co-signs); for these
   * `client` is the student and `domain` is the subject.
   */
  record_type: "work" | "teaching";
  title: string;
  description: string;
  /** Worker handle or wallet that authored the record (teacher, for teaching). */
  worker: string;
  /** Whether the worker is a human or an AI agent. */
  worker_type: "human" | "agent";
  /** Client (or student, for teaching) the record was for. */
  client: string;
  domain: string;
  scope: "small" | "medium" | "large";
  /** ISO date (YYYY-MM-DD). */
  start_date: string;
  end_date: string;
  /** Optional hash/URL of the deliverable (commit, contract address, file hash). */
  deliverable_ref: string;
  tags: string[];
  /** Teaching detail when record_type === "teaching"; null otherwise. */
  teaching: TeachingDetail | null;
}

/**
 * Compute the commitment hash for a payload + salt.
 * Returns lowercase hex of the 32-byte SHA-256 digest.
 */
export async function computeCommitment(
  payload: CanonicalValue,
  salt: string,
): Promise<string> {
  if (!salt || salt.length < 16) {
    throw new Error("computeCommitment: salt must be at least 16 hex chars");
  }
  const canonical = canonicalize(payload);
  const preimage = utf8(`${COMMITMENT_DOMAIN}|${canonical}|${salt}`);
  return sha256Hex(preimage);
}

/**
 * Verify that a revealed payload + salt produce the expected commitment.
 * Constant-string comparison is unnecessary here (commitments are public), so a
 * plain equality is correct and clear.
 */
export async function verifyCommitment(
  payload: CanonicalValue,
  salt: string,
  expectedCommitment: string,
): Promise<boolean> {
  const actual = await computeCommitment(payload, salt);
  return actual.toLowerCase() === expectedCommitment.toLowerCase();
}
