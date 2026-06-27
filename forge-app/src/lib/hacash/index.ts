/**
 * Anchor provider factory.
 *
 * Selects the backend from environment configuration:
 *  - If `HACASH_NODE_URL`, `HACASH_INSCRIBE_PRIVATE_KEY`, and
 *    `HACASH_GENESIS_DIAMOND` are all set -> production Hacash backend.
 *  - Otherwise -> local backend (cryptographically real, off-chain).
 *
 * `ANCHOR_BACKEND=local` forces the local backend even if Hacash config exists.
 */

import { HacashProvider } from "./hacash";
import { LocalAnchorProvider } from "./local";
import type { AnchorProvider } from "./types";

export * from "./types";
export * from "./diamond";

let cached: AnchorProvider | null = null;

export function getAnchorProvider(): AnchorProvider {
  if (cached) return cached;

  const forced = process.env.ANCHOR_BACKEND;
  const nodeUrl = process.env.HACASH_NODE_URL;
  const privateKey = process.env.HACASH_INSCRIBE_PRIVATE_KEY;
  const genesisDiamond = process.env.HACASH_GENESIS_DIAMOND;

  const hacashConfigured = Boolean(nodeUrl && privateKey && genesisDiamond);

  if (forced !== "local" && hacashConfigured) {
    cached = new HacashProvider({
      nodeUrl: nodeUrl!,
      privateKey: privateKey!,
      genesisDiamond: genesisDiamond!,
      fee: process.env.HACASH_FEE ?? "0.0001",
      inscribePath: process.env.HACASH_INSCRIBE_PATH ?? "create/diamond/inscription",
      inscriptionPrefix: process.env.HACASH_INSCRIPTION_PREFIX ?? "forge:",
    });
  } else {
    cached = new LocalAnchorProvider();
  }

  return cached;
}

/** For tests / explicit wiring. */
export function setAnchorProvider(provider: AnchorProvider): void {
  cached = provider;
}
