/**
 * Browser-side seal construction. Runs the exact same crypto core as the server,
 * so the worker's machine computes the commitment — and for NDA seals, the
 * plaintext + salt never leave the browser.
 */

import {
  computeCommitment,
  type TeachingDetail,
  type WorkRecordPayload,
} from "../crypto/commitment";
import { randomSalt } from "../crypto/hash";

export interface SealDraft {
  record_type: "work" | "teaching";
  title: string;
  description: string;
  /** Client, or student for a teaching record. */
  client: string;
  /** Domain, or subject for a teaching record. */
  domain: string;
  scope: "small" | "medium" | "large";
  start_date: string;
  end_date: string;
  deliverable_ref: string;
  tags: string[];
  teaching?: TeachingDetail;
}

export interface BuiltSeal {
  payload: WorkRecordPayload;
  salt: string;
  commitment: string;
}

export async function buildSeal(
  draft: SealDraft,
  worker: string,
  workerType: "human" | "agent",
): Promise<BuiltSeal> {
  const payload: WorkRecordPayload = {
    kind: "work_record",
    v: 1,
    record_type: draft.record_type,
    title: draft.title.trim(),
    description: draft.description.trim(),
    worker,
    worker_type: workerType,
    client: draft.client.trim(),
    domain: draft.domain.trim(),
    scope: draft.scope,
    start_date: draft.start_date,
    end_date: draft.end_date,
    deliverable_ref: draft.deliverable_ref.trim(),
    tags: draft.tags.map((t) => t.trim()).filter(Boolean).slice(0, 5),
    teaching: draft.record_type === "teaching" && draft.teaching ? draft.teaching : null,
  };
  const salt = randomSalt();
  const commitment = await computeCommitment(payload, salt);
  return { payload, salt, commitment };
}

/** Build the same receipt shape the server exports, for client-side download. */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
