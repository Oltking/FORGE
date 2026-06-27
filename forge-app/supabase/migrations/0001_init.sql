-- Forge — initial schema
-- Two-party work attestation protocol on HACD.
--
-- Design notes:
--  * Profiles are not 1:1 with auth users — AI agents and seeded genesis records
--    have profiles with no auth user. `user_id` links a profile to its owner when
--    one exists.
--  * NDA records store NO sensitive data until reveal: only the commitment is
--    persisted. The worker holds {payload, salt} off-server and reveals later.
--    This makes public read of work_records safe.
--  * One anchor batch (one inscribed Merkle root) covers many seals. Each seal
--    carries its leaf index + Merkle proof, so inclusion is verifiable forever.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users (id) on delete set null,
  handle       text not null unique,
  display_name text not null,
  kind         text not null default 'human' check (kind in ('human', 'agent')),
  operator     text,
  bio          text not null default '',
  domains      text[] not null default '{}',
  created_at   timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on profiles (user_id);

-- ---------------------------------------------------------------------------
-- anchor_batches — one inscribed Merkle root
-- ---------------------------------------------------------------------------
create table if not exists anchor_batches (
  id           uuid primary key default gen_random_uuid(),
  root         text not null,
  backend      text not null check (backend in ('hacash', 'local')),
  status       text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  diamond      text not null,
  tx_hash      text,
  block_height integer,
  size         integer not null,
  detail       text,
  anchored_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- forge_contracts — pre-work mutual commitment
-- ---------------------------------------------------------------------------
create table if not exists forge_contracts (
  id            uuid primary key default gen_random_uuid(),
  worker_id     uuid not null references profiles (id) on delete cascade,
  client_handle text not null,
  title         text not null,
  description   text not null,
  criteria      text not null,
  scope         text not null check (scope in ('small', 'medium', 'large')),
  deadline      date,
  status        text not null default 'proposed'
                  check (status in ('proposed', 'accepted', 'completed', 'disputed', 'cancelled')),
  commitment    text not null,
  salt          text not null,
  batch_id      uuid references anchor_batches (id),
  leaf_index    integer,
  merkle_proof  jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists forge_contracts_worker_idx on forge_contracts (worker_id);

-- ---------------------------------------------------------------------------
-- work_records — the sealed record (Layer 0)
-- ---------------------------------------------------------------------------
create table if not exists work_records (
  id              uuid primary key default gen_random_uuid(),
  worker_id       uuid not null references profiles (id) on delete cascade,
  -- Business fields are nullable: an NDA seal leaves them null until reveal.
  title           text,
  description     text,
  client_handle   text,
  domain          text,
  scope           text check (scope in ('small', 'medium', 'large')),
  start_date      date,
  end_date        date,
  deliverable_ref text not null default '',
  tags            text[] not null default '{}',
  mode            text not null default 'public' check (mode in ('public', 'nda')),
  payload         jsonb,
  salt            text,
  commitment      text not null,
  status          text not null default 'sealed' check (status in ('sealed', 'attested', 'disputed')),
  trust_tier      text not null default 'self' check (trust_tier in ('self', 'human', 'machine')),
  contract_id     uuid references forge_contracts (id),
  batch_id        uuid references anchor_batches (id),
  leaf_index      integer,
  merkle_proof    jsonb,
  created_at      timestamptz not null default now(),
  revealed_at     timestamptz
);

create index if not exists work_records_worker_idx on work_records (worker_id);
create index if not exists work_records_commitment_idx on work_records (commitment);
create index if not exists work_records_batch_idx on work_records (batch_id);

-- ---------------------------------------------------------------------------
-- attestations — co-signatures (human) and oracle confirmations (machine)
-- ---------------------------------------------------------------------------
create table if not exists attestations (
  id             uuid primary key default gen_random_uuid(),
  record_id      uuid not null references work_records (id) on delete cascade,
  kind           text not null default 'human' check (kind in ('human', 'machine')),
  attestor_handle text not null,
  attestor_id    uuid references profiles (id),
  note           text not null default '',
  stake_hac      numeric not null default 0.01,
  oracle         text check (oracle in ('github', 'chain', 'ci', 'audit')),
  oracle_ref     text,
  created_at     timestamptz not null default now()
);

create index if not exists attestations_record_idx on attestations (record_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
--   Reads are public (NDA data is never stored until reveal, so this is safe).
--   Writes flow through server routes; ownership-scoped policies apply to the
--   user session, and the service role bypasses RLS for orchestration (anchoring).
-- ---------------------------------------------------------------------------
alter table profiles        enable row level security;
alter table anchor_batches  enable row level security;
alter table forge_contracts enable row level security;
alter table work_records    enable row level security;
alter table attestations    enable row level security;

-- public read
create policy "public read profiles"        on profiles        for select using (true);
create policy "public read batches"         on anchor_batches  for select using (true);
create policy "public read contracts"       on forge_contracts for select using (true);
create policy "public read records"         on work_records    for select using (true);
create policy "public read attestations"    on attestations    for select using (true);

-- profile ownership
create policy "insert own profile" on profiles for insert
  with check (user_id = auth.uid());
create policy "update own profile" on profiles for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- work records: a user may write records for a profile they own
create policy "insert own records" on work_records for insert
  with check (worker_id in (select id from profiles where user_id = auth.uid()));
create policy "update own records" on work_records for update
  using (worker_id in (select id from profiles where user_id = auth.uid()));

-- contracts: same ownership rule
create policy "insert own contracts" on forge_contracts for insert
  with check (worker_id in (select id from profiles where user_id = auth.uid()));
create policy "update own contracts" on forge_contracts for update
  using (worker_id in (select id from profiles where user_id = auth.uid()));

-- attestations: any authenticated user may co-sign; server validates identity
create policy "authenticated attest" on attestations for insert
  with check (auth.uid() is not null);
