-- DataVolley (point-based scouting) schema
-- Run this whole file in Supabase -> SQL Editor on a fresh project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.club_members (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  short_name text,
  is_opponent boolean not null default false,
  -- Reserved for the roster import plugin (e.g. 'minvolleyball').
  external_source text,
  external_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  number int not null check (number >= 0 and number <= 99),
  name text,
  external_id text,
  created_at timestamptz not null default now(),
  unique (team_id, number)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  home_team_id uuid not null references public.teams(id) on delete restrict,
  away_team_id uuid not null references public.teams(id) on delete restrict,
  played_at date not null default current_date,
  venue text,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'finished')),
  track_reception boolean not null default true,
  sets_to_win int not null default 3,
  points_per_set int not null default 25,
  points_final_set int not null default 15,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

-- Which players from the roster are in the squad for this match.
create table if not exists public.match_players (
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  primary key (match_id, player_id)
);

-- One row per set. Lineups are stored as
--   {"positions": [p1, p2, p3, p4, p5, p6], "libero": pid | null}
-- where positions are player ids in court positions 1..6 at the start of the set.
create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  set_number int not null check (set_number between 1 and 5),
  first_server text not null check (first_server in ('home', 'away')),
  home_lineup jsonb not null,
  away_lineup jsonb not null,
  finished boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_id, set_number)
);

-- One row per rally (= one point). This is the whole scouting log.
create table if not exists public.rallies (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  set_number int not null,
  seq int not null,
  -- State at the START of the rally
  serving_team text not null check (serving_team in ('home', 'away')),
  home_rotation int not null check (home_rotation between 0 and 5),
  away_rotation int not null check (away_rotation between 0 and 5),
  -- Reception (receiving team). grade 'error' means the serve was an ace.
  reception_player_id uuid references public.players(id) on delete set null,
  reception_grade text check (reception_grade in ('perfect', 'ok', 'bad', 'error')),
  -- How the rally ended
  winner text not null check (winner in ('home', 'away')),
  outcome text not null check (outcome in ('ace', 'kill', 'block', 'error')),
  -- For ace/kill/block: the player on the winning side who scored.
  -- For error: the player on the losing side who made the error.
  player_id uuid references public.players(id) on delete set null,
  error_type text check (error_type in ('serve', 'attack', 'net', 'handling', 'rotation', 'other')),
  -- Score AFTER this rally
  home_score int not null,
  away_score int not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (match_id, set_number, seq)
);

create index if not exists rallies_match_idx on public.rallies (match_id, set_number, seq);
create index if not exists players_team_idx on public.players (team_id);
create index if not exists teams_club_idx on public.teams (club_id);
create index if not exists matches_club_idx on public.matches (club_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- security definer so that RLS on club_members does not recurse.
create or replace function public.is_club_member(p_club_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.club_members m
    where m.club_id = p_club_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.match_club(p_match_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select club_id from public.matches where id = p_match_id;
$$;

create or replace function public.team_club(p_team_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select club_id from public.teams where id = p_team_id;
$$;

-- The user who creates a club automatically becomes its owner.
create or replace function public.handle_new_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.club_members (club_id, user_id, role)
  values (new.id, coalesce(new.created_by, auth.uid()), 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_club_created on public.clubs;
create trigger on_club_created
  after insert on public.clubs
  for each row execute function public.handle_new_club();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.sets enable row level security;
alter table public.rallies enable row level security;

-- clubs
drop policy if exists clubs_select on public.clubs;
create policy clubs_select on public.clubs for select
  using (public.is_club_member(id));
drop policy if exists clubs_insert on public.clubs;
create policy clubs_insert on public.clubs for insert
  with check (auth.uid() is not null and created_by = auth.uid());
drop policy if exists clubs_update on public.clubs;
create policy clubs_update on public.clubs for update
  using (public.is_club_member(id));
drop policy if exists clubs_delete on public.clubs;
create policy clubs_delete on public.clubs for delete
  using (exists (select 1 from public.club_members m where m.club_id = id and m.user_id = auth.uid() and m.role = 'owner'));

-- club_members
drop policy if exists members_select on public.club_members;
create policy members_select on public.club_members for select
  using (public.is_club_member(club_id));
drop policy if exists members_insert on public.club_members;
create policy members_insert on public.club_members for insert
  with check (public.is_club_member(club_id));
drop policy if exists members_delete on public.club_members;
create policy members_delete on public.club_members for delete
  using (public.is_club_member(club_id));

-- teams
drop policy if exists teams_all on public.teams;
create policy teams_all on public.teams for all
  using (public.is_club_member(club_id))
  with check (public.is_club_member(club_id));

-- players
drop policy if exists players_all on public.players;
create policy players_all on public.players for all
  using (public.is_club_member(public.team_club(team_id)))
  with check (public.is_club_member(public.team_club(team_id)));

-- matches
drop policy if exists matches_all on public.matches;
create policy matches_all on public.matches for all
  using (public.is_club_member(club_id))
  with check (public.is_club_member(club_id));

-- match_players
drop policy if exists match_players_all on public.match_players;
create policy match_players_all on public.match_players for all
  using (public.is_club_member(public.match_club(match_id)))
  with check (public.is_club_member(public.match_club(match_id)));

-- sets
drop policy if exists sets_all on public.sets;
create policy sets_all on public.sets for all
  using (public.is_club_member(public.match_club(match_id)))
  with check (public.is_club_member(public.match_club(match_id)));

-- rallies
drop policy if exists rallies_all on public.rallies;
create policy rallies_all on public.rallies for all
  using (public.is_club_member(public.match_club(match_id)))
  with check (public.is_club_member(public.match_club(match_id)));
