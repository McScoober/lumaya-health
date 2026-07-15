-- ============================================================
-- Lumaya Health — database schema (TRD §14.5 identity/data separation)
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.
--
-- Design:
--   • profiles       = IDENTITY data (name, email, parent/support contact, consent)
--   • health_records = HEALTH data (answers, flags, scores, daily logs) as JSONB,
--                      keyed only by user_id — NO name/email columns alongside it.
--   Both are keyed to auth.uid(). Row-Level Security means each user can only ever
--   touch their OWN rows; you (the owner) read everything from the dashboard, which
--   uses the service role and bypasses RLS.
-- ============================================================

-- ---------- IDENTITY ----------
create table if not exists public.profiles (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  name               text,
  email              text,
  age_band           text,          -- '13'..'17' | '18+'
  is_minor           boolean default false,
  consented_at       timestamptz,
  privacy_ack_at     timestamptz,
  parent_email       text,
  dashboard_active   boolean default false,
  transparency_mode  text default 'full',   -- full | flags | digest
  support_contact    jsonb,          -- { name, email } for 18+ users
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

-- ---------- HEALTH (no PII columns) ----------
create table if not exists public.health_records (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  onboarded     boolean default false,
  result_level  text,               -- Clear | Mild | Moderate | Urgent (denormalized for quick viewing)
  streak        int default 0,
  data          jsonb not null default '{}'::jsonb,  -- answers, flags, scores, daily logs, messages, etc.
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ---------- Advisor requests (so you can action them) ----------
create table if not exists public.advisor_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users (id) on delete cascade,
  result_level  text,
  flag_ids      text[],
  status        text default 'submitted',
  created_at    timestamptz default now()
);

-- ---------- Row-Level Security ----------
alter table public.profiles          enable row level security;
alter table public.health_records    enable row level security;
alter table public.advisor_requests  enable row level security;

-- Each authenticated user (including anonymous sign-ins) may read/write only their own row.
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own health" on public.health_records;
create policy "own health" on public.health_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own advisor requests" on public.advisor_requests;
create policy "own advisor requests" on public.advisor_requests
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- keep updated_at fresh ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists health_touch on public.health_records;
create trigger health_touch before update on public.health_records
  for each row execute function public.touch_updated_at();
