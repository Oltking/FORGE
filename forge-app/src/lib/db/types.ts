/** Database row types — mirror supabase/migrations/0001_init.sql. */

export type ProfileKind = "human" | "agent";
export type Scope = "small" | "medium" | "large";
export type RecordMode = "public" | "nda";
export type RecordStatus = "sealed" | "attested" | "disputed";
export type TrustTier = "self" | "human" | "machine";
export type AnchorBackend = "hacash" | "local";
export type AnchorStatusDb = "pending" | "confirmed" | "failed";
export type AttestationKind = "human" | "machine";
export type OracleKind = "github" | "chain" | "ci" | "audit";
export type ContractStatus =
  | "proposed"
  | "accepted"
  | "completed"
  | "disputed"
  | "cancelled";

export interface Profile {
  id: string;
  user_id: string | null;
  handle: string;
  display_name: string;
  kind: ProfileKind;
  operator: string | null;
  bio: string;
  domains: string[];
  created_at: string;
}

export interface AnchorBatch {
  id: string;
  root: string;
  backend: AnchorBackend;
  status: AnchorStatusDb;
  diamond: string;
  tx_hash: string | null;
  block_height: number | null;
  size: number;
  detail: string | null;
  anchored_at: string | null;
  created_at: string;
}

export interface MerkleProofStep {
  hash: string;
  position: "left" | "right";
}

export interface ForgeContract {
  id: string;
  worker_id: string;
  client_handle: string;
  title: string;
  description: string;
  criteria: string;
  scope: Scope;
  deadline: string | null;
  status: ContractStatus;
  commitment: string;
  salt: string;
  batch_id: string | null;
  leaf_index: number | null;
  merkle_proof: MerkleProofStep[] | null;
  created_at: string;
}

export type RecordType = "work" | "teaching";

export interface WorkRecord {
  id: string;
  worker_id: string;
  record_type: RecordType;
  title: string | null;
  description: string | null;
  client_handle: string | null;
  domain: string | null;
  scope: Scope | null;
  start_date: string | null;
  end_date: string | null;
  deliverable_ref: string;
  tags: string[];
  mode: RecordMode;
  payload: Record<string, unknown> | null;
  salt: string | null;
  commitment: string;
  status: RecordStatus;
  trust_tier: TrustTier;
  contract_id: string | null;
  batch_id: string | null;
  leaf_index: number | null;
  merkle_proof: MerkleProofStep[] | null;
  created_at: string;
  revealed_at: string | null;
}

export interface Attestation {
  id: string;
  record_id: string;
  kind: AttestationKind;
  attestor_handle: string;
  attestor_id: string | null;
  note: string;
  stake_hac: number;
  oracle: OracleKind | null;
  oracle_ref: string | null;
  created_at: string;
}

/** Joined shapes used by the UI. */
export interface WorkRecordWithRelations extends WorkRecord {
  worker?: Profile;
  attestations?: Attestation[];
  batch?: AnchorBatch | null;
}

// --- proofs (the generic proof engine) ---

export type ProofType = "generic" | "ai_eval" | "work" | "priority" | "forecast";
export type ProofVisibility = "sealed" | "partial" | "revealed";

/** A disclosed field opening, as stored/served for public verification. */
export interface StoredOpening {
  value: unknown;
  salt: string;
  proof: MerkleProofStep[];
}

export interface Proof {
  id: string;
  author_id: string | null;
  proof_type: ProofType;
  title: string;
  description: string;
  root: string;
  field_keys: string[];
  disclosed: Record<string, StoredOpening>;
  visibility: ProofVisibility;
  batch_id: string | null;
  leaf_index: number | null;
  merkle_proof: MerkleProofStep[] | null;
  created_at: string;
  revealed_at: string | null;
}

export interface ProofWithRelations extends Proof {
  author?: Profile | null;
  batch?: AnchorBatch | null;
}
