-- A Day Out — cloud storage schema
-- Run this in your Supabase project's SQL Editor (this is a NEW table,
-- named specifically for this app so it won't collide with tables from
-- your other projects sharing the same Supabase instance).

create table if not exists day_out_places (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  city text,
  address text,
  lat double precision,
  lng double precision,

  categories jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,

  cost numeric,
  notes text,
  exhibition_end_date date,
  opening_hours jsonb,

  favorite boolean not null default false,
  visited boolean not null default false,
  google_place_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One user's places should never be visible to another user.
alter table day_out_places enable row level security;

create policy "Users can view their own places"
  on day_out_places for select
  using (auth.uid() = user_id);

create policy "Users can insert their own places"
  on day_out_places for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own places"
  on day_out_places for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own places"
  on day_out_places for delete
  using (auth.uid() = user_id);

-- Speeds up "give me all of this user's places" queries.
create index if not exists day_out_places_user_id_idx on day_out_places(user_id);

-- Keep updated_at current automatically on every edit.
create or replace function day_out_places_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists day_out_places_updated_at on day_out_places;
create trigger day_out_places_updated_at
  before update on day_out_places
  for each row
  execute function day_out_places_set_updated_at();
