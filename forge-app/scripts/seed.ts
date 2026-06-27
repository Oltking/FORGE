/**
 * Seed Forge with real, internally-consistent data: profiles (human + AI agent),
 * sealed work records with genuine commitments, two-party attestations, and a
 * real anchored Merkle batch. Run after applying migrations:
 *
 *   node --env-file=.env.local --import tsx scripts/seed.ts
 *
 * Idempotent guard: bails if the demo data already exists.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createPublicSeal } from "../src/lib/forge/seal";
import { attestRecord } from "../src/lib/forge/attest";
import { anchorPending } from "../src/lib/forge/anchor";
import { buildSeal } from "../src/lib/forge/client";
import { getProfileByHandle, createProfile } from "../src/lib/db/repo";
import type { Profile } from "../src/lib/db/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const db: SupabaseClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureProfile(p: Partial<Profile> & { handle: string; display_name: string }): Promise<Profile> {
  const existing = await getProfileByHandle(db, p.handle);
  if (existing) return existing;
  return createProfile(db, { kind: "human", bio: "", domains: [], ...p });
}

type SealDraft = Parameters<typeof buildSeal>[0];

async function seal(
  worker: Profile,
  draft: Omit<SealDraft, "record_type"> & { record_type?: SealDraft["record_type"] },
) {
  const full: SealDraft = { record_type: "work", ...draft };
  const built = await buildSeal(full, worker.handle, worker.kind);
  return createPublicSeal(db, worker, built.payload, built.salt, built.commitment);
}

async function main() {
  if (await getProfileByHandle(db, "mira.eth")) {
    console.log("Already seeded. Nothing to do.");
    return;
  }

  console.log("Seeding profiles…");
  const mira = await ensureProfile({
    handle: "mira.eth",
    display_name: "Mira",
    bio: "Protocol engineer. Solidity, Rust, MEV.",
    domains: ["Smart Contracts", "Protocol Design", "Rust"],
  });
  const dora = await ensureProfile({
    handle: "dora.dev",
    display_name: "Dora",
    bio: "Full-stack + infra.",
    domains: ["Frontend", "DevOps"],
  });
  const defilabs = await ensureProfile({ handle: "defilabs", display_name: "DeFi Labs" });
  const builddao = await ensureProfile({ handle: "builddao", display_name: "BuildDAO" });
  const chainops = await ensureProfile({ handle: "chainops", display_name: "ChainOps" });
  const agent = await ensureProfile({
    handle: "buildagent-7",
    display_name: "BuildAgent-7",
    kind: "agent",
    operator: "ChainOps Inc.",
    bio: "Autonomous Solidity + deployment agent.",
    domains: ["Smart Contracts", "DevOps"],
  });
  const sage = await ensureProfile({
    handle: "sage.ai",
    display_name: "Sage",
    kind: "agent",
    operator: "Forge Labs",
    bio: "AI tutor agent. Teaches Solidity, Rust, and protocol design with verifiable student outcomes.",
    domains: ["Solidity", "Rust", "Protocol Design"],
  });
  const alex = await ensureProfile({ handle: "alex.eth", display_name: "Alex" });
  const sam = await ensureProfile({ handle: "sam.dev", display_name: "Sam" });

  console.log("Sealing records…");
  const r1 = await seal(mira, {
    title: "AMM Protocol V2 — core implementation",
    description: "Implemented the constant-product core, fee accounting, and TWAP oracle.",
    client: "DeFi Labs",
    domain: "Smart Contracts",
    scope: "large",
    start_date: "2026-03-01",
    end_date: "2026-04-12",
    deliverable_ref: "github.com/defilabs/amm/pull/214",
    tags: ["solidity", "evm", "defi"],
  });
  const r2 = await seal(mira, {
    title: "Gas optimization audit — Uniswap fork",
    description: "Reduced average swap gas by 19% across the router.",
    client: "BuildDAO",
    domain: "Protocol Design",
    scope: "medium",
    start_date: "2026-02-10",
    end_date: "2026-03-05",
    deliverable_ref: "github.com/builddao/router/pull/88",
    tags: ["gas", "evm"],
  });
  const r3 = await seal(dora, {
    title: "Indexer service — Rust migration",
    description: "Ported the indexer from TypeScript to Rust; 4x throughput.",
    client: "ChainOps",
    domain: "DevOps",
    scope: "large",
    start_date: "2026-04-01",
    end_date: "2026-05-20",
    deliverable_ref: "github.com/chainops/indexer/pull/30",
    tags: ["rust", "infra"],
  });
  const r4 = await seal(agent, {
    title: "ERC-4337 paymaster — deployment",
    description: "Generated, tested, and deployed a paymaster contract; 1,847 tests, 100% pass.",
    client: "ChainOps",
    domain: "Smart Contracts",
    scope: "medium",
    start_date: "2026-05-01",
    end_date: "2026-05-03",
    deliverable_ref: "0x9f2a1c4e7b3d8a6f5e2c1b0a9d8c7b6a5f4e3d2c",
    tags: ["erc4337", "solidity"],
  });

  console.log("Sealing teaching records…");
  const t1 = await seal(sage, {
    record_type: "teaching",
    title: "Intro to Solidity — 1:1 mentorship",
    description: "Six sessions: types, storage, modifiers, events, testing, and a capstone ERC-20.",
    client: "alex.eth",
    domain: "Solidity",
    scope: "medium",
    start_date: "2026-05-05",
    end_date: "2026-05-26",
    deliverable_ref: "",
    tags: ["solidity", "beginner"],
    teaching: {
      level: "intro",
      format: "1:1",
      hours: 9,
      outcome: "Can write, test, and deploy an ERC-20 unaided.",
    },
  });
  const t2 = await seal(mira, {
    record_type: "teaching",
    title: "MEV & searcher strategy — advanced cohort",
    description: "Four-week cohort on mempool dynamics, bundle construction, and risk.",
    client: "sam.dev",
    domain: "Protocol Design",
    scope: "large",
    start_date: "2026-04-01",
    end_date: "2026-04-28",
    deliverable_ref: "",
    tags: ["mev", "advanced"],
    teaching: {
      level: "advanced",
      format: "cohort",
      hours: 16,
      outcome: "Built and back-tested a working arbitrage searcher.",
    },
  });

  console.log("Attesting…");
  // Students co-sign their teaching records — the mutual stake, teaching edition.
  await attestRecord(db, t1.id, alex, { note: "Sage's pacing was excellent. I shipped my first token.", stake_hac: 0.02 });
  await attestRecord(db, t2.id, sam, { note: "Confirmed — my searcher is live on testnet.", stake_hac: 0.03 });
  await attestRecord(db, r1.id, defilabs, { note: "Delivered on time and exceeded scope on the oracle.", stake_hac: 0.05 });
  await attestRecord(db, r2.id, builddao, { note: "Confirmed 19% gas reduction in our benchmarks.", stake_hac: 0.02 });
  await attestRecord(db, r4.id, chainops, {
    note: "Deployment confirmed on-chain.",
    oracle: "chain",
    oracle_ref: "0x9f2a1c4e7b3d8a6f5e2c1b0a9d8c7b6a5f4e3d2c",
  });
  // r3 intentionally left unattested — a one-party seal (the absence is signal).

  console.log("Anchoring batch…");
  const res = await anchorPending(db);
  console.log(res.message);

  console.log("\nSeed complete. Records:", [r1, r2, r3, r4].map((r) => r.id).join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
