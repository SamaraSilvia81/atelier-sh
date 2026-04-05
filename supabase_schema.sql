-- ============================================
-- Atelier.sh — Schema Supabase v9
-- ============================================

-- Extensões
create extension if not exists "uuid-ossp";

-- ── Organizações ──────────────────────────────
create table organizations (
  id          uuid primary key default uuid_generate_v4(),
  owner_id    uuid references auth.users(id) on delete cascade,
  name        text not null,
  slug        text not null,
  description text,
  color       text default '#5C3D8F',
  -- Trello
  trello_workspace_id   text,
  trello_workspace_name text,
  -- GitHub
  github_org  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(owner_id, slug)
);

-- ── Grupos ────────────────────────────────────
create table groups (
  id              uuid primary key default uuid_generate_v4(),
  org_id          uuid references organizations(id) on delete cascade,
  name            text not null,
  description     text,
  -- GitHub
  github_repo     text,  -- formato: usuario/repo
  github_token    text,  -- token por grupo (opcional — repos privados de orgs diferentes)
  -- Trello
  trello_board_id   text,
  trello_board_name text,
  -- Figma
  figma_url       text,
  -- Integrantes
  members         jsonb default '[]'::jsonb,
  -- Tags e etapas personalizadas
  tags            jsonb default '[]'::jsonb,
  stage           text,
  -- Status manual
  status          text default 'active' check (status in ('active','attention','inactive')),
  color           text default '#5C3D8F',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── Anotações ─────────────────────────────────
create table notes (
  id         uuid primary key default uuid_generate_v4(),
  group_id   uuid references groups(id) on delete cascade,
  org_id     uuid references organizations(id) on delete cascade,
  title      text not null default 'Sem título',
  content    text,          -- rich text HTML (TipTap)
  pinned     boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Cache GitHub (evitar rate limit) ──────────
create table github_cache (
  id           uuid primary key default uuid_generate_v4(),
  group_id     uuid references groups(id) on delete cascade,
  repo         text not null,
  last_commit  jsonb,
  atas         jsonb,
  fetched_at   timestamptz default now()
);

-- ── RLS Policies ──────────────────────────────
alter table organizations enable row level security;
alter table groups         enable row level security;
alter table notes          enable row level security;
alter table github_cache   enable row level security;

-- Organizations: só o dono vê/edita
create policy "owner_orgs" on organizations
  for all using (auth.uid() = owner_id);

-- Groups: via organização do dono
create policy "owner_groups" on groups
  for all using (
    exists (
      select 1 from organizations o
      where o.id = groups.org_id and o.owner_id = auth.uid()
    )
  );

-- Notes: via organização do dono
create policy "owner_notes" on notes
  for all using (
    exists (
      select 1 from organizations o
      where o.id = notes.org_id and o.owner_id = auth.uid()
    )
  );

-- GitHub cache: via grupo
create policy "owner_cache" on github_cache
  for all using (
    exists (
      select 1 from groups g
      join organizations o on o.id = g.org_id
      where g.id = github_cache.group_id and o.owner_id = auth.uid()
    )
  );

-- ── Triggers updated_at ───────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_orgs_updated
  before update on organizations
  for each row execute function update_updated_at();

create trigger trg_groups_updated
  before update on groups
  for each row execute function update_updated_at();

create trigger trg_notes_updated
  before update on notes
  for each row execute function update_updated_at();

-- ══════════════════════════════════════════════
-- SE VOCÊ JÁ TEM O BANCO RODANDO (v8 → v9):
-- Execute apenas isso no SQL Editor do Supabase:
-- ══════════════════════════════════════════════
-- ALTER TABLE groups ADD COLUMN IF NOT EXISTS figma_url text;
-- ALTER TABLE groups ADD COLUMN IF NOT EXISTS members jsonb DEFAULT '[]'::jsonb;
-- ALTER TABLE groups ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;
-- ALTER TABLE groups ADD COLUMN IF NOT EXISTS stage text;

-- ALTER TABLE groups ADD COLUMN IF NOT EXISTS github_token text;

-- ══════════════════════════════════════════════
-- MIGRATION v9 → v12: Tabela de Reviews
-- Execute no SQL Editor do Supabase
-- ══════════════════════════════════════════════

create table if not exists reviews (
  id           uuid primary key default uuid_generate_v4(),
  group_id     uuid references groups(id) on delete cascade not null,
  org_id       uuid references organizations(id) on delete cascade not null,
  url          text,                          -- URL revisada
  annotations  jsonb default '[]'::jsonb,     -- comentários, checks, crosses
  paths        jsonb default '[]'::jsonb,     -- desenhos SVG
  updated_at   timestamptz default now()
);

-- Garantir um review por grupo (upsert por group_id)
create unique index if not exists reviews_group_id_idx on reviews(group_id);

-- RLS
alter table reviews enable row level security;

create policy "owner_reviews" on reviews
  for all using (
    exists (
      select 1 from organizations o
      where o.id = reviews.org_id and o.owner_id = auth.uid()
    )
  );

-- Trigger updated_at
create trigger trg_reviews_updated
  before update on reviews
  for each row execute function update_updated_at();

-- Perfil do usuário
create table if not exists profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  name      text,
  role      text,
  bio       text,
  website   text,
  github    text,
  twitter   text,
  avatar    text,
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "owner_profile" on profiles
  for all using (auth.uid() = id);

create trigger trg_profiles_updated
  before update on profiles
  for each row execute function update_updated_at();

-- Auto-criar perfil ao registrar usuário
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
