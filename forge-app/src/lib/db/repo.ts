/**
 * Data access. Every function takes a Supabase client so it works with both the
 * request-scoped session client (RLS enforced) and the admin client (RLS
 * bypassed, for orchestration).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Attestation,
  AnchorBatch,
  ForgeContract,
  MerkleProofStep,
  Profile,
  Proof,
  ProofWithRelations,
  WorkRecord,
  WorkRecordWithRelations,
} from "./types";

type DB = SupabaseClient;

function unwrap<T>(data: T | null, error: { message: string } | null, ctx: string): T {
  if (error) throw new Error(`${ctx}: ${error.message}`);
  if (data === null) throw new Error(`${ctx}: not found`);
  return data;
}

// --- profiles --------------------------------------------------------------

export async function getProfileByHandle(db: DB, handle: string): Promise<Profile | null> {
  const { data, error } = await db.from("profiles").select("*").eq("handle", handle).maybeSingle();
  if (error) throw new Error(`getProfileByHandle: ${error.message}`);
  return data;
}

export async function getProfileById(db: DB, id: string): Promise<Profile | null> {
  const { data, error } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getProfileById: ${error.message}`);
  return data;
}

export async function getProfileByUserId(db: DB, userId: string): Promise<Profile | null> {
  const { data, error } = await db.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(`getProfileByUserId: ${error.message}`);
  return data;
}

export async function listProfiles(db: DB): Promise<Profile[]> {
  const { data, error } = await db.from("profiles").select("*").order("created_at", { ascending: true });
  if (error) throw new Error(`listProfiles: ${error.message}`);
  return data ?? [];
}

export async function createProfile(db: DB, input: Partial<Profile>): Promise<Profile> {
  const { data, error } = await db.from("profiles").insert(input).select("*").single();
  return unwrap(data, error, "createProfile");
}

// --- work records ----------------------------------------------------------

export async function createRecord(db: DB, input: Partial<WorkRecord>): Promise<WorkRecord> {
  const { data, error } = await db.from("work_records").insert(input).select("*").single();
  return unwrap(data, error, "createRecord");
}

export async function updateRecord(db: DB, id: string, patch: Partial<WorkRecord>): Promise<WorkRecord> {
  const { data, error } = await db.from("work_records").update(patch).eq("id", id).select("*").single();
  return unwrap(data, error, "updateRecord");
}

export async function getRecordById(db: DB, id: string): Promise<WorkRecord | null> {
  const { data, error } = await db.from("work_records").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getRecordById: ${error.message}`);
  return data;
}

export async function getRecordByCommitment(db: DB, commitment: string): Promise<WorkRecord | null> {
  const { data, error } = await db
    .from("work_records")
    .select("*")
    .eq("commitment", commitment.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`getRecordByCommitment: ${error.message}`);
  return data;
}

export async function listRecordsByWorker(db: DB, workerId: string): Promise<WorkRecord[]> {
  const { data, error } = await db
    .from("work_records")
    .select("*")
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listRecordsByWorker: ${error.message}`);
  return data ?? [];
}

export async function listRecentRecords(db: DB, limit = 20): Promise<WorkRecordWithRelations[]> {
  const { data, error } = await db
    .from("work_records")
    .select("*, worker:profiles!work_records_worker_id_fkey(*), attestations(*), batch:anchor_batches(*)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listRecentRecords: ${error.message}`);
  return (data ?? []) as unknown as WorkRecordWithRelations[];
}

export async function getRecordWithRelations(db: DB, id: string): Promise<WorkRecordWithRelations | null> {
  const { data, error } = await db
    .from("work_records")
    .select("*, worker:profiles!work_records_worker_id_fkey(*), attestations(*), batch:anchor_batches(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getRecordWithRelations: ${error.message}`);
  return data as unknown as WorkRecordWithRelations | null;
}

export async function listUnanchoredRecords(db: DB): Promise<WorkRecord[]> {
  const { data, error } = await db
    .from("work_records")
    .select("*")
    .is("batch_id", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listUnanchoredRecords: ${error.message}`);
  return data ?? [];
}

export async function attachProof(
  db: DB,
  id: string,
  batchId: string,
  leafIndex: number,
  proof: MerkleProofStep[],
): Promise<void> {
  const { error } = await db
    .from("work_records")
    .update({ batch_id: batchId, leaf_index: leafIndex, merkle_proof: proof })
    .eq("id", id);
  if (error) throw new Error(`attachProof: ${error.message}`);
}

// --- anchor batches --------------------------------------------------------

export async function createBatch(db: DB, input: Partial<AnchorBatch>): Promise<AnchorBatch> {
  const { data, error } = await db.from("anchor_batches").insert(input).select("*").single();
  return unwrap(data, error, "createBatch");
}

export async function getBatchById(db: DB, id: string): Promise<AnchorBatch | null> {
  const { data, error } = await db.from("anchor_batches").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getBatchById: ${error.message}`);
  return data;
}

// --- attestations ----------------------------------------------------------

export async function createAttestation(db: DB, input: Partial<Attestation>): Promise<Attestation> {
  const { data, error } = await db.from("attestations").insert(input).select("*").single();
  return unwrap(data, error, "createAttestation");
}

export async function listAttestationsByRecord(db: DB, recordId: string): Promise<Attestation[]> {
  const { data, error } = await db
    .from("attestations")
    .select("*")
    .eq("record_id", recordId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`listAttestationsByRecord: ${error.message}`);
  return data ?? [];
}

// --- proofs ----------------------------------------------------------------

export async function createProof(db: DB, input: Partial<Proof>): Promise<Proof> {
  const { data, error } = await db.from("proofs").insert(input).select("*").single();
  return unwrap(data, error, "createProof");
}

export async function updateProof(db: DB, id: string, patch: Partial<Proof>): Promise<Proof> {
  const { data, error } = await db.from("proofs").update(patch).eq("id", id).select("*").single();
  return unwrap(data, error, "updateProof");
}

export async function getProofById(db: DB, id: string): Promise<Proof | null> {
  const { data, error } = await db.from("proofs").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getProofById: ${error.message}`);
  return data;
}

export async function getProofWithRelations(db: DB, id: string): Promise<ProofWithRelations | null> {
  const { data, error } = await db
    .from("proofs")
    .select("*, author:profiles!proofs_author_id_fkey(*), batch:anchor_batches(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getProofWithRelations: ${error.message}`);
  return data as unknown as ProofWithRelations | null;
}

export async function listRecentProofs(db: DB, limit = 20): Promise<ProofWithRelations[]> {
  const { data, error } = await db
    .from("proofs")
    .select("*, author:profiles!proofs_author_id_fkey(*), batch:anchor_batches(*)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listRecentProofs: ${error.message}`);
  return (data ?? []) as unknown as ProofWithRelations[];
}

// --- contracts -------------------------------------------------------------

export async function createContract(db: DB, input: Partial<ForgeContract>): Promise<ForgeContract> {
  const { data, error } = await db.from("forge_contracts").insert(input).select("*").single();
  return unwrap(data, error, "createContract");
}

export async function listContractsByWorker(db: DB, workerId: string): Promise<ForgeContract[]> {
  const { data, error } = await db
    .from("forge_contracts")
    .select("*")
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listContractsByWorker: ${error.message}`);
  return data ?? [];
}
