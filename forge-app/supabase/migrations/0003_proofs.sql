-- Forge — generic proofs (the proof engine)
--
-- A proof seals a structured set of fields under one Merkle root (see
-- lib/crypto/disclosure). Only the root + the field *names* are stored server
-- side; values and per-field salts stay with the author until they choose to
-- disclose specific fields. Disclosed openings are stored so anyone can verify.
--
-- The root is anchored on HACD via the same batch mechanism as work records:
-- the proof's root becomes a leaf in an anchor batch's Merkle tree.
--
-- Work attestation (work_records) remains its own table; "work" is simply one
-- proof_type here for proofs created through the generic engine.

create table if not exists proofs (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid references profiles (id) on delete set null,
  proof_type    text not null default 'generic'
                  check (proof_type in ('generic', 'ai_eval', 'work', 'priority', 'forecast')),
  title         text not null,
  description   text not null default '',
  -- field-level selective-disclosure Merkle root (the proof commitment)
  root          text not null,
  -- public shape: the sealed field names (values stay hidden until disclosed)
  field_keys    text[] not null default '{}',
  -- openings the author has chosen to disclose: { key: { value, salt, proof } }
  disclosed     jsonb not null default '{}'::jsonb,
  visibility    text not null default 'sealed'
                  check (visibility in ('sealed', 'partial', 'revealed')),
  -- anchoring of `root` into an anchor batch
  batch_id      uuid references anchor_batches (id),
  leaf_index    integer,
  merkle_proof  jsonb,
  created_at    timestamptz not null default now(),
  revealed_at   timestamptz
);

create index if not exists proofs_author_idx on proofs (author_id);
create index if not exists proofs_root_idx on proofs (root);
create index if not exists proofs_type_idx on proofs (proof_type);
create index if not exists proofs_batch_idx on proofs (batch_id);

alter table proofs enable row level security;

create policy "public read proofs" on proofs for select using (true);

create policy "insert own proofs" on proofs for insert
  with check (author_id in (select id from profiles where user_id = auth.uid()));

create policy "update own proofs" on proofs for update
  using (author_id in (select id from profiles where user_id = auth.uid()));
