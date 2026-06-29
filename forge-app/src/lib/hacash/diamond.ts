/**
 * HACD (Hacash Diamond) helpers.
 *
 * Every HACD is a unique 6-letter combination from a fixed 16-letter alphabet.
 * Total space: 16^6 = 16,777,216. These are PoW-mined, bid-for, indivisible
 * containers — the substrate Forge inscribes Merkle roots onto via HIP-15.
 *
 * Alphabet (canonical, from the Hacash ecosystem spec):
 *   W T Y U I A H X V M E K B S Z N
 */

export const HACD_ALPHABET = "WTYUIAHXVMEKBSZN";
export const HACD_LENGTH = 6;
export const HACD_TOTAL_SPACE = HACD_ALPHABET.length ** HACD_LENGTH; // 16,777,216

const HACD_RE = new RegExp(`^[${HACD_ALPHABET}]{${HACD_LENGTH}}$`);

export function isValidDiamondName(name: string): boolean {
  return HACD_RE.test(name);
}

export function assertValidDiamondName(name: string): string {
  if (!isValidDiamondName(name)) {
    throw new Error(
      `Invalid HACD name "${name}": must be ${HACD_LENGTH} letters from ${HACD_ALPHABET}`,
    );
  }
  return name;
}

/**
 * Explorer URL for a diamond's on-chain record (where an inscription can be
 * independently inspected).
 */
export function diamondExplorerUrl(name: string): string {
  return `https://explorer.hacash.org/diamond/${name}`;
}

export function blockExplorerUrl(height: number): string {
  return `https://explorer.hacash.org/block/${height}`;
}

export function txExplorerUrl(hash: string): string {
  return `https://explorer.hacash.org/tx/${hash}`;
}
