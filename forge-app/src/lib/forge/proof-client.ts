/**
 * Browser-side proof construction. The author seals locally — values and
 * per-field salts never leave the browser until they choose to disclose. The
 * full SealedProof is the author's keystore; without it, sealed fields can never
 * be disclosed, so it must be exported.
 */

import {
  sealFields,
  discloseFields,
  type FieldMap,
  type SealedProof,
  type FieldOpening,
} from "../crypto/disclosure";

export type { SealedProof, FieldOpening, FieldMap };

export async function buildProof(fields: FieldMap): Promise<SealedProof> {
  return sealFields(fields);
}

export async function makeOpenings(
  sealed: SealedProof,
  keys: string[],
): Promise<FieldOpening[]> {
  return discloseFields(sealed, keys);
}

/** The author's keystore — everything needed to disclose fields later. */
export function buildKeystore(sealed: SealedProof, meta: { title: string; proof_type: string }) {
  return {
    forge_keystore: "v1",
    proof_type: meta.proof_type,
    title: meta.title,
    root: sealed.root,
    fields: sealed.fields, // key, value, salt, commitment, index
  };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
