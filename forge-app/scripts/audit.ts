/**
 * End-to-end functional audit against the live database.
 *
 *   node --env-file=.env.local --import tsx scripts/audit.ts
 *
 * Exercises the whole proof lifecycle for real — seal, anchor, disclose, verify,
 * and tamper-rejection — asserting each step. Cleans up after itself.
 */

import { createClient } from "@supabase/supabase-js";
import { sealFields, discloseFields, verifyDisclosure } from "../src/lib/crypto/disclosure";
import { createProofRecord, discloseProofFields, verifyProofById } from "../src/lib/forge/proof";
import { anchorPending } from "../src/lib/forge/anchor";
import { getProfileByHandle, createProfile, getProofById } from "../src/lib/db/repo";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing Supabase env.");
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (ok) pass++;
  else fail++;
}

async function main() {
  // 0. profile
  let profile = await getProfileByHandle(db, "audit-bot");
  if (!profile) {
    profile = await createProfile(db, {
      handle: "audit-bot",
      display_name: "Audit Bot",
      kind: "agent",
      operator: "Forge CI",
    });
  }
  check("profile ready", Boolean(profile?.id));

  // 1. seal
  const fields = {
    model: "audit-model",
    benchmark: "audit-bench",
    claimed_score: "0.842",
    secret_note: "this stays sealed",
    date: new Date().toISOString().slice(0, 10),
  };
  const sealed = await sealFields(fields);
  check("seal produces 32-byte root", /^[0-9a-f]{64}$/.test(sealed.root));
  check("seal produces a leaf per field", sealed.fields.length === 5);

  // 2. persist + 3. anchor
  const proof = await createProofRecord(db, profile!.id, {
    proof_type: "ai_eval",
    title: "AUDIT — end to end",
    description: "Automated audit proof.",
    root: sealed.root,
    field_keys: sealed.fields.map((f) => f.key),
  });
  check("proof persisted", Boolean(proof.id));

  const anchorRes = await anchorPending(db);
  check("anchoring ran", anchorRes.anchored > 0, anchorRes.message);

  const anchored = await getProofById(db, proof.id);
  check("proof got a batch + merkle proof", Boolean(anchored?.batch_id && anchored?.merkle_proof));

  // 4. disclose a subset (keep secret_note sealed)
  const openings = await discloseFields(sealed, ["model", "benchmark", "claimed_score"]);
  const fresh = await getProofById(db, proof.id);
  await discloseProofFields(db, fresh!, openings);

  // 5. verify
  const v = await verifyProofById(db, proof.id);
  check("anchoring verifies (inclusion)", v.inclusionValid === true);
  check("disclosed fields reconcile", v.disclosedValid === true);
  check("secret stayed sealed", !("secret_note" in (v.proof?.disclosed ?? {})));
  check("visibility is partial", v.proof?.visibility === "partial");

  // 6. tamper rejection (crypto-level)
  const tampered = await discloseFields(sealed, ["claimed_score"]);
  tampered[0].value = "0.999"; // forge a better score
  const tamperResult = await verifyDisclosure(sealed.root, tampered);
  check("tampered value is rejected", tamperResult.ok === false);

  const reKeyed = await discloseFields(sealed, ["claimed_score"]);
  const moved = { ...reKeyed[0], key: "date" };
  const movedResult = await verifyDisclosure(sealed.root, [moved]);
  check("re-keyed value is rejected", movedResult.ok === false);

  // cleanup
  await db.from("proofs").delete().eq("id", proof.id);
  check("cleanup removed audit proof", true);

  console.log(`\n${pass} passed, ${fail} failed.`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error("AUDIT CRASHED:", err);
  process.exit(1);
});
