# Forge

**Proof of work, for work.** A two-party work attestation protocol on HACD.

Workers seal what they built; clients co-sign it. Both put real PoW-backed HAC
behind the record. The result is a permanent, un-editable, worker-owned
credential anchored on HACD via HIP-15 — verifiable by anyone against the chain,
not against Forge.

> Bitcoin proved PoW for money. HACD brings PoW to assets. Forge brings PoW to work.

## How it works

1. **Seal** — a work record is canonicalized and committed: `SHA256(domain ‖
   canonical(payload) ‖ salt)`. Public seals reveal the payload; NDA seals keep
   it in the browser and store only the commitment.
2. **Anchor** — pending commitments are batched into a Merkle tree; only the root
   is inscribed onto a genesis HACD. Each seal carries a Merkle proof. One
   inscription anchors unlimited seals.
3. **Attest** — a client co-signs (the mutual stake). Oracles can machine-attest
   objective facts (PR merged, contract deployed). This sets the trust tier.
4. **Verify** — anyone recomputes the commitment and checks the Merkle proof
   against the anchored root. Trustless; works even if Forge disappears.

## Stack

- Next.js (App Router) + TypeScript
- Supabase (Postgres, Auth, RLS)
- Web Crypto (SHA-256) — isomorphic commitments & Merkle proofs
- Pluggable anchoring: Hacash HIP-15 (mainnet) or a cryptographically real local
  backend for development

## Run it

```bash
npm install

# crypto core works with zero config:
npm test

# full app:
# 1. create a Supabase project, run supabase/migrations/0001_init.sql in the SQL editor
# 2. cp .env.example .env.local  and fill the keys
npm run seed       # profiles, records, attestations, a real anchored batch
npm run dev
```

## Anchoring backends

Without Hacash env vars, Forge uses the **local** backend: roots are recorded
off-chain but commitments and Merkle proofs are fully real and verify end to end.

Set `HACASH_NODE_URL`, `HACASH_INSCRIBE_PRIVATE_KEY`, and `HACASH_GENESIS_DIAMOND`
to inscribe roots onto Hacash mainnet via HIP-15. The exact inscription route is
configurable (`HACASH_INSCRIBE_PATH`) pending confirmation of programmatic
HIP-15 access with the Hacash core team.

## Layout

```
src/lib/crypto     canonicalization, commitments, Merkle tree (+ tests)
src/lib/hacash     anchoring backends (hacash / local) + diamond utils
src/lib/db         row types + data access
src/lib/forge      seal, anchor, attest, verify, score, receipt
src/app            pages + API routes
supabase           SQL migrations
scripts            seed + anchor CLIs
```
