/**
 * Merkle tree over seal commitments.
 *
 * Anchoring every individual seal on-chain would not scale (only 100 genesis
 * HACDs, and HIP-15 inscriptions cost HAC). Instead, pending seals are batched:
 * we build a Merkle tree of their commitments and inscribe only the 32-byte
 * root onto a HACD. Each seal then carries a Merkle proof linking its commitment
 * to that root. One inscription anchors unlimited seals; verification stays
 * trustless.
 *
 * Security:
 *  - Domain separation: leaves are hashed with prefix 0x00, internal nodes with
 *    0x01. This makes it impossible to pass an internal node off as a leaf
 *    (second-preimage / CVE-2012-2459-class defence).
 *  - Odd nodes are carried up unchanged rather than duplicated, removing the
 *    duplicate-leaf malleability entirely.
 */

import { bytesToHex, concatBytes, hexToBytes, sha256 } from "./hash";

const LEAF_PREFIX = new Uint8Array([0x00]);
const NODE_PREFIX = new Uint8Array([0x01]);

export type ProofStep = { hash: string; position: "left" | "right" };
export type MerkleProof = ProofStep[];

export interface MerkleTree {
  root: string;
  leaves: string[]; // leaf hashes (hex), in input order
}

async function hashLeaf(commitmentHex: string): Promise<Uint8Array> {
  return sha256(concatBytes(LEAF_PREFIX, hexToBytes(commitmentHex)));
}

async function hashNode(left: Uint8Array, right: Uint8Array): Promise<Uint8Array> {
  return sha256(concatBytes(NODE_PREFIX, left, right));
}

/**
 * Build a Merkle tree from an ordered list of commitment hashes (hex).
 * Returns the root and the computed leaf hashes.
 */
export async function buildMerkleTree(commitments: string[]): Promise<MerkleTree> {
  if (commitments.length === 0) {
    throw new Error("buildMerkleTree: cannot build a tree with no commitments");
  }

  const leafBytes = await Promise.all(commitments.map(hashLeaf));
  const leaves = leafBytes.map(bytesToHex);

  let level = leafBytes;
  while (level.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        next.push(await hashNode(level[i], level[i + 1]));
      } else {
        // Odd node out — carry up unchanged.
        next.push(level[i]);
      }
    }
    level = next;
  }

  return { root: bytesToHex(level[0]), leaves };
}

/**
 * Produce a Merkle proof for the commitment at `index` within `commitments`.
 * The proof is the list of sibling hashes from leaf to root.
 */
export async function buildMerkleProof(
  commitments: string[],
  index: number,
): Promise<MerkleProof> {
  if (index < 0 || index >= commitments.length) {
    throw new Error("buildMerkleProof: index out of range");
  }

  let level = await Promise.all(commitments.map(hashLeaf));
  let idx = index;
  const proof: MerkleProof = [];

  while (level.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        next.push(await hashNode(level[i], level[i + 1]));
      } else {
        next.push(level[i]);
      }
    }

    if (idx % 2 === 0) {
      // Node is a left child; sibling is on the right (if it exists).
      if (idx + 1 < level.length) {
        proof.push({ hash: bytesToHex(level[idx + 1]), position: "right" });
      }
      // else: carried up — no sibling step recorded.
    } else {
      proof.push({ hash: bytesToHex(level[idx - 1]), position: "left" });
    }

    idx = Math.floor(idx / 2);
    level = next;
  }

  return proof;
}

/**
 * Verify a Merkle proof: does `commitment`, combined with `proof`, reproduce
 * `root`? Pure and trustless — this is what a third party runs to confirm a seal
 * was included in an anchored batch.
 */
export async function verifyMerkleProof(
  commitment: string,
  proof: MerkleProof,
  root: string,
): Promise<boolean> {
  let acc = await hashLeaf(commitment);

  for (const step of proof) {
    const sibling = hexToBytes(step.hash);
    acc =
      step.position === "left"
        ? await hashNode(sibling, acc)
        : await hashNode(acc, sibling);
  }

  return bytesToHex(acc).toLowerCase() === root.toLowerCase();
}
