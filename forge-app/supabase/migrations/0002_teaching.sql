-- Forge — teaching records
--
-- Teaching is a first-class kind of attested work: a teacher (human or AI agent)
-- runs a session/course/mentorship, and the *student* co-signs that they were
-- taught and what they can now do. Same two-party mutual stake, new shape.
--
-- We add a single discriminator column; teaching specifics (level, format, hours,
-- outcome) live inside the sealed payload so they are part of the commitment and
-- shown for public records. For a teaching record, `client_handle` is the student
-- and `domain` is the subject.

alter table work_records
  add column if not exists record_type text not null default 'work'
    check (record_type in ('work', 'teaching'));

create index if not exists work_records_type_idx on work_records (record_type);
