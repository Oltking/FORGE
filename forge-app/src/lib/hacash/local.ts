/**
 * Local anchoring backend.
 *
 * Records a Merkle root immediately and immutably without writing to Hacash.
 * It is cryptographically real: the root is the genuine root of the batch, and
 * Merkle proofs verify against it exactly as they would against an on-chain
 * root. It is the correct backend for development and for any deployment that
 * has not yet provisioned a funded mainnet key.
 *
 * The "diamond" assigned here is a deterministic, valid HACD-shaped label
 * derived from the root, so the data model is identical to the production path.
 */

import { hexToBytes } from "../crypto/hash";
import type { AnchorProvider, AnchorReceipt } from "./types";
import { HACD_ALPHABET, HACD_LENGTH } from "./diamond";

/** Map a root deterministically to a valid HACD-shaped label (local namespace). */
function deriveLocalDiamond(root: string): string {
  const bytes = hexToBytes(root);
  let name = "";
  for (let i = 0; i < HACD_LENGTH; i++) {
    name += HACD_ALPHABET[bytes[i] % HACD_ALPHABET.length];
  }
  return name;
}

export class LocalAnchorProvider implements AnchorProvider {
  readonly backend = "local" as const;

  async anchorRoot(root: string): Promise<AnchorReceipt> {
    if (!/^[0-9a-f]{64}$/i.test(root)) {
      throw new Error("LocalAnchorProvider: root must be a 32-byte hex string");
    }
    return {
      backend: "local",
      status: "confirmed",
      root: root.toLowerCase(),
      diamond: deriveLocalDiamond(root),
      txHash: null,
      blockHeight: null,
      anchoredAt: new Date().toISOString(),
      detail:
        "Local anchor — cryptographically real, not written to Hacash mainnet. " +
        "Configure a Hacash fullnode + key to anchor on-chain.",
    };
  }

  async getStatus(receipt: AnchorReceipt): Promise<AnchorReceipt> {
    return receipt;
  }
}
