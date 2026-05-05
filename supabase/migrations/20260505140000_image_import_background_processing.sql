-- Image Import: per-image status tracking + background processing groundwork.
--
-- Why: today the edge function uploads all images for an import synchronously inside one
-- HTTP request. With many images Shopify takes minutes; the edge function exceeds its time
-- budget, the client never receives a response, and `imports.status` stays stuck on
-- "processing" because that is the only status update site in the request/response cycle.
--
-- This migration:
--  1. Adds per-image status columns to `import_images` so each image can be tracked
--     independently (status, attempts, error, Shopify media id, started/completed timestamps).
--  2. Adds the product mapping (productid + name) directly on `import_images` so the
--     background worker no longer needs the full payload echoed in every request.
--  3. Extends `imports.status` with `queued` and `partial`.
--  4. Extends the `imports_with_list_preview` view with success/fail/pending counts so the
--     frontend can render real progress.
--  5. Resets imports stuck in `processing` for more than 5 minutes back to `pending`.

-- ─── 1. Per-image columns ─────────────────────────────────────────────────────
alter table public.import_images
  add column if not exists status text not null default 'pending',
  add column if not exists shopify_product_id text,
  add column if not exists shopify_product_name text,
  add column if not exists shopify_media_id text,
  add column if not exists error_message text,
  add column if not exists attempts integer not null default 0,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'import_images_status_check'
  ) then
    alter table public.import_images
      add constraint import_images_status_check
      check (status in ('pending', 'uploading', 'succeeded', 'failed', 'skipped'));
  end if;
end $$;

create index if not exists idx_import_images_status
  on public.import_images (import_id, status);

-- Auto-update `updated_at` on row mutations.
create or replace function public.touch_import_images_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_import_images_touch_updated_at on public.import_images;
create trigger trg_import_images_touch_updated_at
  before update on public.import_images
  for each row execute function public.touch_import_images_updated_at();

-- ─── 2. Extend `imports.status` allowed values ───────────────────────────────
do $$
declare
  conname text;
begin
  select c.conname into conname
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  where t.relname = 'imports'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%status%';

  if conname is not null then
    execute format('alter table public.imports drop constraint %I', conname);
  end if;

  alter table public.imports
    add constraint imports_status_check
    check (status in ('pending', 'queued', 'processing', 'completed', 'failed', 'partial'));
end $$;

-- ─── 3. Reset rows currently stuck in `processing` ───────────────────────────
update public.imports
set status = 'pending'
where status = 'processing'
  and updated_at < now() - interval '5 minutes';

-- ─── 4. Refresh the list-preview view to expose progress counts ──────────────
-- Drop+recreate (vs. CREATE OR REPLACE) because we are changing column order — Postgres
-- forbids shifting existing columns under CREATE OR REPLACE VIEW.
drop view if exists public.imports_with_list_preview;

create view public.imports_with_list_preview
with (security_invoker = true) as
select
  i.id,
  i.brand_id,
  i.batch_name,
  i.status,
  i.webhook_url,
  i.created_at,
  i.updated_at,
  (
    select count(*)::bigint
    from public.import_images ii
    where ii.import_id = i.id
  ) as image_count,
  (
    select count(*)::bigint
    from public.import_images ii
    where ii.import_id = i.id and ii.status = 'succeeded'
  ) as succeeded_count,
  (
    select count(*)::bigint
    from public.import_images ii
    where ii.import_id = i.id and ii.status = 'failed'
  ) as failed_count,
  (
    select count(*)::bigint
    from public.import_images ii
    where ii.import_id = i.id and ii.status = 'pending'
  ) as pending_count,
  (
    select count(*)::bigint
    from public.import_images ii
    where ii.import_id = i.id and ii.status = 'uploading'
  ) as uploading_count,
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', x.id,
          'file_name', x.file_name,
          'file_url', x.file_url
        )
        order by x.ord_created, x.ord_id
      )
      from (
        select
          ii2.id,
          ii2.file_name,
          ii2.file_url,
          ii2.created_at as ord_created,
          ii2.id as ord_id
        from public.import_images ii2
        where ii2.import_id = i.id
        order by ii2.created_at asc, ii2.id asc
        limit 3
      ) x
    ),
    '[]'::jsonb
  ) as preview_images
from public.imports i;

grant select on public.imports_with_list_preview to authenticated;
