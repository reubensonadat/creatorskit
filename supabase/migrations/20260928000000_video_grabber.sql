-- =============================================================
-- CreatorKit · Video Grabber (Phase 1)
-- Ad-gated media downloads — supervisor ledger schema
-- Run in Supabase SQL editor, or `supabase db push`
-- =============================================================

-- 1. Ad challenges: server-verified "watch the ad" waits.
--    The supervisor only mints a download ticket after not_before.
create table if not exists public.ad_challenges (
  id uuid primary key default gen_random_uuid(),
  url_hash text not null,
  ip_hash text not null,
  not_before timestamptz not null,
  expires_at timestamptz not null,
  claimed boolean not null default false,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_ad_challenges_ip on public.ad_challenges (ip_hash, created_at desc);

-- 2. Download tickets: one-time, TTL-limited unlock tokens.
create table if not exists public.download_tickets (
  ticket text primary key,
  url_hash text not null,
  ip_hash text not null,
  status text not null default 'active', -- active | used | expired
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists idx_download_tickets_url_hash on public.download_tickets (url_hash);

-- 3. Daily quota ledger per hashed IP.
create table if not exists public.download_quota (
  ip_hash text not null,
  day date not null default current_date,
  count integer not null default 0,
  primary key (ip_hash, day)
);

-- 4. Analytics events (powers the future dashboard).
create table if not exists public.download_events (
  id bigint generated always as identity primary key,
  platform text,
  outcome text not null, -- granted | denied_quota | denied_bad_url | denied_challenge | stream_start | stream_error | worker_pass | worker_offline
  url_hash text,
  ip_hash text,
  bytes bigint default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_download_events_created on public.download_events (created_at desc);

-- Atomic quota increment (called from the edge function).
create or replace function public.increment_download_quota(p_ip_hash text)
returns integer
language plpgsql
security definer
as $$
declare
  new_count integer;
begin
  insert into public.download_quota (ip_hash, day, count)
  values (p_ip_hash, current_date, 1)
  on conflict (ip_hash, day)
  do update set count = public.download_quota.count + 1
  returning count into new_count;
  return new_count;
end;
$$;

-- Lock everything down: ONLY the service role (edge function) can touch these.
-- No RLS policies = anon/authenticated clients get nothing.
alter table public.ad_challenges enable row level security;
alter table public.download_tickets enable row level security;
alter table public.download_quota enable row level security;
alter table public.download_events enable row level security;
