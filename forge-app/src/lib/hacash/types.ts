/**
 * Anchoring backend contract.
 *
 * Forge anchors a batch's Merkle root permanently and verifiably. There are two
 * real backends behind this one interface:
 *
 *  - `hacash`: inscribes the root onto a genesis HACD via HIP-15 on Hacash
 *    mainnet. This is the production backend. It requires a reachable fullnode,
 *    a funded key, and a genesis diamond.
 *
 *  - `local`: a self-contained, cryptographically real anchor used for
 *    development and for environments without a funded mainnet wallet. It does
 *    not write to Hacash, but it produces a real, immutable anchor record and
 *    fully supports Merkle-proof verification end to end.
 *
 * Both are real. Neither fabricates a fake mainnet transaction. The backend that
 * produced an anchor is always recorded, so a record's trust level is explicit.
 */

export type AnchorBackend = "hacash" | "local";

export type AnchorStatus = "pending" | "confirmed" | "failed";

export interface AnchorReceipt {
  backend: AnchorBackend;
  status: AnchorStatus;
  /** The Merkle root that was anchored (hex). */
  root: string;
  /** HACD the root was inscribed onto (production) or the logical anchor id (local). */
  diamond: string;
  /** On-chain transaction hash, when available. */
  txHash: string | null;
  /** Block height of confirmation, when available. */
  blockHeight: number | null;
  /** ISO timestamp of the anchoring event. */
  anchoredAt: string;
  /** Backend-specific detail, surfaced for diagnostics. */
  detail?: string;
}

export interface AnchorProvider {
  readonly backend: AnchorBackend;
  /** Inscribe / record a Merkle root. Returns a receipt (possibly pending). */
  anchorRoot(root: string): Promise<AnchorReceipt>;
  /** Re-check the status of a previously created anchor. */
  getStatus(receipt: AnchorReceipt): Promise<AnchorReceipt>;
}
