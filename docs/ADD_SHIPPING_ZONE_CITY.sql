-- Paste this entire script into the Supabase SQL Editor and run it once.
-- It is safe to run again: the table, columns, indexes, and policy are guarded.

create extension if not exists pgcrypto;

create table if not exists public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  region text,
  city text,
  base_fee numeric(12, 2) not null default 0 check (base_fee >= 0),
  per_km_fee numeric(12, 2) not null default 0 check (per_km_fee >= 0),
  min_delivery_days integer not null default 1 check (min_delivery_days >= 0),
  max_delivery_days integer not null default 5 check (max_delivery_days >= min_delivery_days),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade an older shipping_zones table if one exists with fewer columns.
alter table public.shipping_zones
  add column if not exists name text,
  add column if not exists country text,
  add column if not exists region text,
  add column if not exists city text,
  add column if not exists base_fee numeric(12, 2) default 0,
  add column if not exists per_km_fee numeric(12, 2) default 0,
  add column if not exists min_delivery_days integer default 1,
  add column if not exists max_delivery_days integer default 5,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists shipping_zones_location_idx
  on public.shipping_zones (country, region, city);

create index if not exists shipping_zones_active_idx
  on public.shipping_zones (is_active);

create or replace function public.set_shipping_zone_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_shipping_zone_updated_at on public.shipping_zones;
create trigger set_shipping_zone_updated_at
before update on public.shipping_zones
for each row execute function public.set_shipping_zone_updated_at();

alter table public.shipping_zones enable row level security;

drop policy if exists "Public can read active shipping zones" on public.shipping_zones;
create policy "Public can read active shipping zones"
on public.shipping_zones
for select
to anon, authenticated
using (is_active = true);

grant select on public.shipping_zones to anon, authenticated;
