import { describe, it, expect } from "vitest";
import {
  sealFields,
  discloseFields,
  verifyDisclosure,
  fieldCommitment,
  type FieldMap,
} from "./disclosure";

function evalProof(): FieldMap {
  return {
    model: "forge-eval-1",
    benchmark: "MMLU-pro",
    test_set_hash: "9f2a1c4e7b3d8a6f5e2c1b0a9d8c7b6a",
    protocol: "0-shot, temperature 0, sealed before release",
    claimed_score: 0.913,
    date: "2026-06-29",
  };
}

describe("selective disclosure", () => {
  it("seals a payload to a stable 32-byte root", async () => {
    const sealed = await sealFields(evalProof());
    expect(sealed.root).toMatch(/^[0-9a-f]{64}$/);
    expect(sealed.fields).toHaveLength(6);
    // every field has its own salt
    const salts = new Set(sealed.fields.map((f) => f.salt));
    expect(salts.size).toBe(6);
  });

  it("verifies a disclosed subset against the root", async () => {
    const sealed = await sealFields(evalProof());
    const openings = await discloseFields(sealed, ["claimed_score", "date"]);
    const result = await verifyDisclosure(sealed.root, openings);
    expect(result.ok).toBe(true);
    expect(result.fields.map((f) => f.key).sort()).toEqual(["claimed_score", "date"]);
  });

  it("supports a full reveal (all fields)", async () => {
    const sealed = await sealFields(evalProof());
    const openings = await discloseFields(
      sealed,
      sealed.fields.map((f) => f.key),
    );
    const result = await verifyDisclosure(sealed.root, openings);
    expect(result.ok).toBe(true);
    expect(result.fields).toHaveLength(6);
  });

  it("rejects a tampered value", async () => {
    const sealed = await sealFields(evalProof());
    const openings = await discloseFields(sealed, ["claimed_score"]);
    openings[0].value = 0.999; // claim a better score than was sealed
    const result = await verifyDisclosure(sealed.root, openings);
    expect(result.ok).toBe(false);
    expect(result.fields[0].valid).toBe(false);
  });

  it("rejects a value moved to a different key", async () => {
    const sealed = await sealFields(evalProof());
    const [scoreOpening] = await discloseFields(sealed, ["claimed_score"]);
    // try to pass the score's value+salt off under a different key
    const forged = { ...scoreOpening, key: "date" };
    const result = await verifyDisclosure(sealed.root, [forged]);
    expect(result.ok).toBe(false);
  });

  it("rejects an opening against the wrong root", async () => {
    const sealed = await sealFields(evalProof());
    const other = await sealFields({ ...evalProof(), model: "different" });
    const openings = await discloseFields(sealed, ["model"]);
    const result = await verifyDisclosure(other.root, openings);
    expect(result.ok).toBe(false);
  });

  it("keeps undisclosed fields hidden (only their value, never leaked by disclosure)", async () => {
    const sealed = await sealFields(evalProof());
    const openings = await discloseFields(sealed, ["date"]);
    // The opening set references only the disclosed key; no other value appears.
    const serialized = JSON.stringify(openings);
    expect(serialized).toContain("2026-06-29");
    expect(serialized).not.toContain("0.913"); // claimed_score not revealed
    expect(serialized).not.toContain("MMLU-pro");
  });

  it("per-field salt makes identical values commit differently across seals", async () => {
    const a = await sealFields(evalProof());
    const b = await sealFields(evalProof());
    const aScore = a.fields.find((f) => f.key === "claimed_score")!;
    const bScore = b.fields.find((f) => f.key === "claimed_score")!;
    expect(aScore.value).toBe(bScore.value);
    expect(aScore.commitment).not.toBe(bScore.commitment); // different salts
  });

  it("fieldCommitment rejects short salts", async () => {
    await expect(fieldCommitment("k", "v", "short")).rejects.toThrow();
  });
});
