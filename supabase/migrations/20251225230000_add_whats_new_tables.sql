-- Migration: Add What's New feature tables
-- Description: Creates tables for storing release announcements and feature highlights

-- Create whats_new_releases table
create table if not exists public.whats_new_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  title text not null,
  is_active boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create whats_new_features table
create table if not exists public.whats_new_features (
  id uuid primary key default gen_random_uuid(),
  release_id uuid references public.whats_new_releases(id) on delete cascade,
  title text not null,
  description text not null,
  image_path text,
  display_order int not null default 0,
  created_at timestamptz default now()
);

-- Add last_seen_version to profiles
alter table public.profiles
  add column if not exists last_seen_version text;

-- Create indexes for performance
create index if not exists idx_whats_new_releases_active on public.whats_new_releases(is_active) where is_active = true;
create index if not exists idx_whats_new_features_release on public.whats_new_features(release_id);

-- RLS Policies: Public read access for releases and features
alter table public.whats_new_releases enable row level security;
alter table public.whats_new_features enable row level security;

create policy "Anyone can read active releases"
  on public.whats_new_releases for select
  using (true);

create policy "Anyone can read features"
  on public.whats_new_features for select
  using (true);

-- Trigger to update updated_at timestamp
create or replace function update_whats_new_releases_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger whats_new_releases_updated_at
  before update on public.whats_new_releases
  for each row
  execute function update_whats_new_releases_updated_at();

-- Create storage bucket for images (run via Supabase dashboard or CLI)
-- Note: Storage bucket 'whats-new-images' should be created with public read access
