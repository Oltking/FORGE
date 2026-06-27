import { describe, it, expect } from "vitest";
import { canonicalize } from "./canonical";
import { randomSalt, sha256Hex } from "./hash";
import {
  computeCommitment,
  verifyCommitment,
  type WorkRecordPayload,
} from "./commitment";
import {
  buildMerkleTree,
  buildMerkleProof,
  verifyMerkleProof,
} from "./merkle";

function samplePayload(over: Partial<WorkRecordPayload> = {}): WorkRecordPayload {
  return {
    kind: "work_record",
    v: 1,
    record_type: "work",
    title: "AMM Protocol V2 — core implementation",
    description: "Implemented the constant-product core and fee accounting.",
    worker: "mira.eth",
    worker_type: "human",
    client: "DeFi Labs",
    domain: "Smart Contracts",
    scope: "large",
    start_date: "2026-03-01",
    end_date: "2026-04-12",
    deliverable_ref: "github.com/defilabs/amm/pull/214",
    tags: ["solidity", "evm", "defi"],
    teaching: null,
    ...over,
  };
}

describe("canonicalize", () => {
  it("is independent of key order", () => {
    const a = canonicalize({ b: 1, a: 2, c: [3, { y: 1, x: 2 }] });
    const b = canonicalize({ c: [3, { x: 2, y: 1 }], a: 2, b: 1 });
    expect(a).toBe(b);
  });

  it("rejects non-finite numbers", () => {
    expect(() => canonicalize({ x: Infinity })).toThrow();
    expect(() => canonicalize({ x: NaN })).toThrow();
  });

  it("omits undefined object fields", () => {
    expect(canonicalize({ a: 1, b: undefined as never })).toBe('{"a":1}');
  });
});

describe("commitment", () => {
  it("is reproducible from payload + salt", async () => {
    const payload = samplePayload();
    const salt = randomSalt();
    const c1 = await computeCommitment(payload, salt);
    const c2 = await computeCommitment(payload, salt);
    expect(c1).toBe(c2);
    expect(c1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes if any field changes", async () => {
    const salt = randomSalt();
    const base = await computeCommitment(samplePayload(), salt);
    const altered = await computeCommitment(
      samplePayload({ title: "AMM Protocol V2 — core implementation " }),
      salt,
    );
    expect(altered).not.toBe(base);
  });

  it("changes with a different salt (hiding low-entropy payloads)", async () => {
    const payload = samplePayload({ description: "yes" });
    const c1 = await computeCommitment(payload, randomSalt());
    const c2 = await computeCommitment(payload, randomSalt());
    expect(c1).not.toBe(c2);
  });

  it("verifies a correct reveal and rejects a forged one", async () => {
    const payload = samplePayload();
    const salt = randomSalt();
    const commitment = await computeCommitment(payload, salt);

    expect(await verifyCommitment(payload, salt, commitment)).toBe(true);
    expect(
      await verifyCommitment(samplePayload({ client: "Other Co" }), salt, commitment),
    ).toBe(false);
    expect(await verifyCommitment(payload, randomSalt(), commitment)).toBe(false);
  });

  it("rejects too-short salts", async () => {
    await expect(computeCommitment(samplePayload(), "short")).rejects.toThrow();
  });
});

describe("merkle tree", () => {
  it("produces a stable 32-byte root", async () => {
    const commitments = await Promise.all(
      Array.from({ length: 5 }, (_, i) => sha256Hex(`leaf-${i}`)),
    );
    const tree = await buildMerkleTree(commitments);
    expect(tree.root).toMatch(/^[0-9a-f]{64}$/);
    expect(tree.leaves).toHaveLength(5);
  });

  it("verifies a valid proof for every leaf at various sizes", async () => {
    for (const size of [1, 2, 3, 4, 7, 8, 9, 16, 31, 100]) {
      const commitments = await Promise.all(
        Array.from({ length: size }, (_, i) => sha256Hex(`c-${size}-${i}`)),
      );
      const tree = await buildMerkleTree(commitments);
      for (let i = 0; i < size; i++) {
        const proof = await buildMerkleProof(commitments, i);
        expect(await verifyMerkleProof(commitments[i], proof, tree.root)).toBe(true);
      }
    }
  });

  it("rejects a proof against the wrong root", async () => {
    const commitments = await Promise.all(
      Array.from({ length: 8 }, (_, i) => sha256Hex(`x-${i}`)),
    );
    const tree = await buildMerkleTree(commitments);
    const proof = await buildMerkleProof(commitments, 3);
    const wrongRoot = await sha256Hex("not-the-root");
    expect(await verifyMerkleProof(commitments[3], proof, wrongRoot)).toBe(false);
  });

  it("rejects a proof for a commitment not in the tree", async () => {
    const commitments = await Promise.all(
      Array.from({ length: 6 }, (_, i) => sha256Hex(`y-${i}`)),
    );
    const tree = await buildMerkleTree(commitments);
    const proof = await buildMerkleProof(commitments, 2);
    const outsider = await sha256Hex("outsider");
    expect(await verifyMerkleProof(outsider, proof, tree.root)).toBe(false);
  });

  it("end-to-end: seal -> batch -> proof -> verify", async () => {
    const salt = randomSalt();
    const myCommitment = await computeCommitment(samplePayload(), salt);

    const others = await Promise.all(
      Array.from({ length: 12 }, (_, i) => sha256Hex(`other-${i}`)),
    );
    const batch = [...others.slice(0, 5), myCommitment, ...others.slice(5)];
    const myIndex = 5;

    const tree = await buildMerkleTree(batch);
    const proof = await buildMerkleProof(batch, myIndex);

    // A verifier with only {payload, salt, proof, root} can confirm inclusion.
    const recomputed = await computeCommitment(samplePayload(), salt);
    expect(recomputed).toBe(myCommitment);
    expect(await verifyMerkleProof(recomputed, proof, tree.root)).toBe(true);
  });
});
