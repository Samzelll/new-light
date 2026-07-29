-- Core schema for Opinion Net (Supabase)
-- Tables: profiles, contests, entries, votes
-- Visibility/feed moderation matches the React scaffold
--
-- This script is idempotent. It re-checks built-in Supabase resources
-- (auth schema, storage bucket), adds missing columns/indexes, and
-- recreates policies/triggers only when absent.

-- Ensure required extensions exist (uuid helpers + cryptographic ids)
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Sanity check: profile references rely on auth.users table (managed by Supabase)
-- The following raises if auth schema is unavailable.
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'auth' and table_name = 'users'
  ) then
    raise exception 'Supabase auth.users table not found. Ensure Supabase Auth is enabled.';
  end if;
end;
$$;

-- Profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  role text not null default 'user',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Backfill columns if table already existed without them
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists updated_at timestamptz default now();

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
before update on profiles
for each row execute function public.set_profiles_updated_at();

-- Contests
create table if not exists contests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  visibility text not null default 'public' check (visibility in ('public','private')),
  feed_listing_status text not null default 'none' check (feed_listing_status in ('none','pending','approved','rejected')),
  creator_id uuid not null references profiles(id) on delete cascade,
  slug text unique,
  stages_count int default 1 check (stages_count between 1 and 10),
  max_entries_per_user int default 1 check (max_entries_per_user between 1 and 5),
  max_participants int check (max_participants is null or max_participants <= 120),
  approval_required boolean default true,
  created_at timestamptz default now()
);

-- Ensure required columns exist if table pre-existed
alter table contests add column if not exists slug text unique;
alter table contests add column if not exists stages_count int default 1 check (stages_count between 1 and 10);
alter table contests add column if not exists max_entries_per_user int default 1 check (max_entries_per_user between 1 and 5);
alter table contests add column if not exists max_participants int;
alter table contests add column if not exists approval_required boolean default true;
alter table contests add column if not exists created_at timestamptz default now();
alter table contests add column if not exists feed_listing_status text not null default 'none' check (feed_listing_status in ('none','pending','approved','rejected'));
alter table contests add column if not exists visibility text not null default 'public' check (visibility in ('public','private'));

-- Normalize constraints if missing (unique slug)
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'contests'
      and indexname = 'contests_slug_key'
  ) then
    begin
      alter table contests add constraint contests_slug_key unique (slug);
    exception when duplicate_object then
      null;
    end;
  end if;
end;
$$;

-- Entries
create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references contests(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  media_url text,
  caption text,
  votes_count int default 0,
  created_at timestamptz default now()
);

alter table entries add column if not exists votes_count int default 0;
alter table entries add column if not exists caption text;
alter table entries alter column votes_count set default 0;

-- Votes
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references entries(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(entry_id, user_id)
);


alter table votes add column if not exists created_at timestamptz default now();

-- Helpful indexes
create index if not exists idx_contests_feed on contests(feed_listing_status, visibility, created_at desc);
create index if not exists idx_entries_contest on entries(contest_id);
create index if not exists idx_votes_entry on votes(entry_id);

do $$

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'update_votes_count_insert'
  ) then
    perform 1;
  end if;
end;
$$;
-- Maintain votes_count on entries
begin
  if tg_op = 'INSERT' then
    update entries set votes_count = votes_count + 1 where id = new.entry_id;
  elsif tg_op = 'DELETE' then
    update entries set votes_count = greatest(votes_count - 1, 0) where id = old.entry_id;
  end if;
  return null;
create or replace function public.sync_votes_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update entries set votes_count = coalesce(votes_count, 0) + 1 where id = new.entry_id;
  elsif tg_op = 'DELETE' then
    update entries set votes_count = greatest(coalesce(votes_count, 0) - 1, 0) where id = old.entry_id;
  end if;
  return null;
end;
$$;

drop trigger if exists update_votes_count_insert on votes;
create trigger update_votes_count_insert
after insert on votes
for each row execute function public.sync_votes_count();

drop trigger if exists update_votes_count_delete on votes;
create trigger update_votes_count_delete
after delete on votes
for each row execute function public.sync_votes_count();

-- RLS enable
alter table profiles enable row level security;
alter table contests enable row level security;
alter table entries enable row level security;
alter table votes enable row level security;

-- RLS policies (adjust role detection as needed)
-- Assume profiles.role = 'admin' marks admin

-- Profiles: each user sees self
create policy if not exists profiles_select_self on profiles
for select using (auth.uid() = id);

-- Contests: select approved publics or own
create policy if not exists contests_select_public_or_own on contests
for select using (
  (visibility = 'public' and feed_listing_status = 'approved')
  or (creator_id = auth.uid())
);

-- Contests: insert by authenticated
create policy if not exists contests_insert_own on contests
for insert with check (auth.uid() = creator_id);

-- Contests: update own (except feed status)
create policy if not exists contests_update_own on contests
for update using (auth.uid() = creator_id)
with check (
  auth.uid() = creator_id and feed_listing_status = old.feed_listing_status
);

-- Contests: admin can update feed_listing_status
create policy if not exists contests_update_feed_admin on contests
for update using (
  auth.uid() in (select id from profiles where role = 'admin')
)
with check (
  true
);

-- Entries: author or contest creator can see contest; others see if contest is approved+public
create policy if not exists entries_select_visibility on entries
for select using (
  exists (
    select 1 from contests c
    where c.id = entries.contest_id
      and (
        (c.visibility = 'public' and c.feed_listing_status = 'approved')
        or c.creator_id = auth.uid()
        or entries.user_id = auth.uid()
      )
  )
);

-- Entries: insert by authenticated, only into contest they can see/participate
create policy if not exists entries_insert on entries
for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from contests c
    where c.id = contest_id
      and (
        c.visibility = 'public'
        or c.creator_id = auth.uid()
      )
  )
);

-- Votes: select allowed if contest visible (same as entries)
create policy if not exists votes_select on votes
for select using (
  exists (
    select 1 from entries e
    join contests c on c.id = e.contest_id
    where e.id = votes.entry_id
      and (
        (c.visibility = 'public' and c.feed_listing_status = 'approved')
        or c.creator_id = auth.uid()
        or e.user_id = auth.uid()
      )
  )
);

-- Votes: insert one per entry per user; allow if contest visible
create policy if not exists votes_insert on votes
for insert with check (
  auth.uid() = user_id
  and not exists (select 1 from votes v where v.entry_id = entry_id and v.user_id = auth.uid())
  and exists (
    select 1 from entries e
    join contests c on c.id = e.contest_id
    where e.id = entry_id
      and (
        c.visibility = 'public'
        or c.creator_id = auth.uid()
      )
  )
);

-- NOTE: adjust admin detection, add storage policies separately.
-- NOTE: adjust admin detection, add storage policies separately.
-- Storage bucket bootstrap (safe to re-run)
insert into storage.buckets (id, name, public)
select 'contest-media', 'contest-media', true
where not exists (
  select 1 from storage.buckets where id = 'contest-media'
);

insert into storage.policies (id, bucket_id, name, allowed_mime_types, allowed_operations, definition)
select
  gen_random_uuid(),
  'contest-media',
  'Allow authenticated users to manage own files',
  null,
  '{"*"}',
  '(auth.uid() is not null)'
where not exists (
  select 1
  from storage.policies
  where bucket_id = 'contest-media'
    and name = 'Allow authenticated users to manage own files'
);
