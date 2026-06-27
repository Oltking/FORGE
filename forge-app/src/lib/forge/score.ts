/**
 * Forge Score — a single credibility number derived purely from on-chain-style
 * evidence (sealed records + attestations). Never self-reported.
 *
 * Components (weighted):
 *   - Attestation rate: share of revealed records that are human/machine attested
 *   - Trust depth: machine-attested records weigh more than human-attested
 *   - Client diversity: distinct attesting clients (breadth of relationships)
 *   - Volume: number of sealed records (log-scaled, capped)
 *   - Integrity: disputes drag the score down
 *
 * Output is 0–100 with a transparent breakdown so it can be explained, not just
 * displayed.
 */

import type { Attestation, WorkRecord } from "../db/types";

export interface ScoreInput {
  records: WorkRecord[];
  attestationsByRecord: Map<string, Attestation[]>;
}

export interface ScoreBreakdown {
  score: number;
  attestationRate: number;
  trustDepth: number;
  clientDiversity: number;
  volume: number;
  integrity: number;
  totals: {
    records: number;
    attested: number;
    machineAttested: number;
    distinctClients: number;
    disputed: number;
  };
}

const WEIGHTS = {
  attestationRate: 35,
  trustDepth: 20,
  clientDiversity: 20,
  volume: 15,
  integrity: 10,
};

export function computeForgeScore(input: ScoreInput): ScoreBreakdown {
  const visible = input.records.filter((r) => r.mode === "public" || r.revealed_at);
  const total = visible.length;

  let attested = 0;
  let machineAttested = 0;
  let disputed = 0;
  const clients = new Set<string>();

  for (const r of visible) {
    const atts = input.attestationsByRecord.get(r.id) ?? [];
    if (r.status === "disputed") disputed++;
    if (atts.length > 0) {
      attested++;
      for (const a of atts) {
        if (a.attestor_handle) clients.add(a.attestor_handle.toLowerCase());
        if (a.kind === "machine") machineAttested++;
      }
    }
  }

  const attestationRate = total ? attested / total : 0;
  const trustDepth = attested ? Math.min(1, machineAttested / attested + 0.4) : 0;
  const clientDiversity = Math.min(1, clients.size / 5); // 5+ distinct clients = full
  const volume = Math.min(1, Math.log2(total + 1) / Math.log2(33)); // ~32 records = full
  const integrity = total ? 1 - Math.min(1, disputed / total) : 1;

  const score = Math.round(
    attestationRate * WEIGHTS.attestationRate +
      trustDepth * WEIGHTS.trustDepth +
      clientDiversity * WEIGHTS.clientDiversity +
      volume * WEIGHTS.volume +
      integrity * WEIGHTS.integrity,
  );

  return {
    score,
    attestationRate: round2(attestationRate),
    trustDepth: round2(trustDepth),
    clientDiversity: round2(clientDiversity),
    volume: round2(volume),
    integrity: round2(integrity),
    totals: {
      records: total,
      attested,
      machineAttested,
      distinctClients: clients.size,
      disputed,
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
