create table public.invoice_document_artifacts (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoice_issuance_snapshots(invoice_id) on delete restrict,
  physio_id uuid not null references public.physiotherapists(id) on delete restrict,
  snapshot_schema_version integer not null check (snapshot_schema_version > 0),
  document_version integer not null check (document_version > 0),
  renderer_version text not null check (length(trim(renderer_version)) > 0),
  storage_bucket text not null check (length(trim(storage_bucket)) > 0),
  storage_object_path text not null unique check (length(trim(storage_object_path)) > 0),
  mime_type text not null default 'application/pdf' check (mime_type = 'application/pdf'),
  byte_size bigint,
  sha256 text,
  generation_status text not null check (generation_status in ('pending', 'complete', 'failed')),
  generation_token uuid,
  generation_started_at timestamptz,
  generated_at timestamptz,
  last_error_code text,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_document_artifacts_invoice_version_key unique (invoice_id, document_version),
  constraint invoice_document_artifacts_sha256_check check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  constraint invoice_document_artifacts_complete_check check (
    generation_status <> 'complete'
    or (byte_size is not null and byte_size > 0 and sha256 is not null and generated_at is not null)
  )
);

create index invoice_document_artifacts_physio_id_idx on public.invoice_document_artifacts (physio_id);

alter table public.invoice_document_artifacts enable row level security;

create policy invoice_document_artifacts_owner_select
  on public.invoice_document_artifacts
  for select
  to authenticated
  using (private.owns_physio(physio_id));

revoke all on table public.invoice_document_artifacts from anon, authenticated;
grant select on table public.invoice_document_artifacts to authenticated;
grant select, insert, update, delete on table public.invoice_document_artifacts to service_role;

create or replace function private.reject_completed_invoice_document_artifact_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.generation_status = 'complete' then
    raise exception 'Completed invoice document artifacts are immutable';
  end if;
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    return new;
  end if;
  return old;
end;
$$;

revoke all on function private.reject_completed_invoice_document_artifact_mutation() from public;

create trigger reject_completed_invoice_document_artifact_mutation
before update or delete on public.invoice_document_artifacts
for each row execute function private.reject_completed_invoice_document_artifact_mutation();

create or replace function public.claim_invoice_document_artifact(
  p_invoice_id uuid,
  p_physio_id uuid,
  p_snapshot_schema_version integer,
  p_document_version integer,
  p_renderer_version text,
  p_storage_bucket text,
  p_storage_object_path text,
  p_generation_token uuid
)
returns table (
  action text,
  artifact_id uuid,
  generation_status text,
  storage_bucket text,
  storage_object_path text,
  byte_size bigint,
  sha256 text
)
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_artifact public.invoice_document_artifacts%rowtype;
begin
  if not exists (
    select 1 from public.invoice_issuance_snapshots s
    where s.invoice_id = p_invoice_id
      and s.physio_id = p_physio_id
      and s.snapshot_schema_version = p_snapshot_schema_version
  ) then
    raise exception 'Invoice issuance snapshot ownership/version mismatch';
  end if;

  insert into public.invoice_document_artifacts (
    invoice_id, physio_id, snapshot_schema_version, document_version, renderer_version,
    storage_bucket, storage_object_path, generation_status, generation_token, generation_started_at
  ) values (
    p_invoice_id, p_physio_id, p_snapshot_schema_version, p_document_version, p_renderer_version,
    p_storage_bucket, p_storage_object_path, 'pending', p_generation_token, now()
  )
  on conflict (invoice_id, document_version) do nothing
  returning * into v_artifact;

  if v_artifact.id is not null then
    return query select 'claimed', v_artifact.id, v_artifact.generation_status,
      v_artifact.storage_bucket, v_artifact.storage_object_path, v_artifact.byte_size, v_artifact.sha256;
    return;
  end if;

  select * into v_artifact
  from public.invoice_document_artifacts
  where invoice_id = p_invoice_id and document_version = p_document_version
  for update;

  if v_artifact.physio_id <> p_physio_id
     or v_artifact.snapshot_schema_version <> p_snapshot_schema_version
     or v_artifact.renderer_version <> p_renderer_version
     or v_artifact.storage_bucket <> p_storage_bucket
     or v_artifact.storage_object_path <> p_storage_object_path then
    raise exception 'Existing artifact identity does not match requested contract';
  end if;

  if v_artifact.generation_status = 'complete' then
    return query select 'complete', v_artifact.id, v_artifact.generation_status,
      v_artifact.storage_bucket, v_artifact.storage_object_path, v_artifact.byte_size, v_artifact.sha256;
    return;
  end if;

  if v_artifact.generation_status = 'pending'
     and v_artifact.generation_started_at is not null
     and v_artifact.generation_started_at > now() - interval '5 minutes' then
    return query select 'in_progress', v_artifact.id, v_artifact.generation_status,
      v_artifact.storage_bucket, v_artifact.storage_object_path, v_artifact.byte_size, v_artifact.sha256;
    return;
  end if;

  update public.invoice_document_artifacts
  set generation_status = 'pending', generation_token = p_generation_token, generation_started_at = now(),
      last_error_code = null, last_error_at = null
  where id = v_artifact.id
  returning * into v_artifact;

  return query select 'claimed', v_artifact.id, v_artifact.generation_status,
    v_artifact.storage_bucket, v_artifact.storage_object_path, v_artifact.byte_size, v_artifact.sha256;
end;
$$;

revoke all on function public.claim_invoice_document_artifact(uuid, uuid, integer, integer, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.claim_invoice_document_artifact(uuid, uuid, integer, integer, text, text, text, uuid) to service_role;

create or replace function public.complete_invoice_document_artifact(
  p_artifact_id uuid,
  p_generation_token uuid,
  p_byte_size bigint,
  p_sha256 text
)
returns public.invoice_document_artifacts
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_artifact public.invoice_document_artifacts%rowtype;
begin
  update public.invoice_document_artifacts
  set generation_status = 'complete', byte_size = p_byte_size, sha256 = p_sha256,
      generated_at = now(), generation_token = null, last_error_code = null, last_error_at = null
  where id = p_artifact_id and generation_status = 'pending' and generation_token = p_generation_token
  returning * into v_artifact;

  if v_artifact.id is null then
    raise exception 'Artifact generation claim is no longer owned by this worker';
  end if;
  return v_artifact;
end;
$$;

revoke all on function public.complete_invoice_document_artifact(uuid, uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.complete_invoice_document_artifact(uuid, uuid, bigint, text) to service_role;

create or replace function public.fail_invoice_document_artifact(
  p_artifact_id uuid,
  p_generation_token uuid,
  p_error_code text
)
returns void
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
begin
  update public.invoice_document_artifacts
  set generation_status = 'failed', generation_token = null,
      last_error_code = left(coalesce(p_error_code, 'generation_failed'), 120), last_error_at = now()
  where id = p_artifact_id and generation_status = 'pending' and generation_token = p_generation_token;
end;
$$;

revoke all on function public.fail_invoice_document_artifact(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.fail_invoice_document_artifact(uuid, uuid, text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invoice-pdf-artifacts', 'invoice-pdf-artifacts', false, 10485760, array['application/pdf'])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
