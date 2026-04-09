-- ============================================================
-- Atelier.sh — Migration v10
-- Novidades:
--   1. visibility (private/public) em organizations, projects, groups, notes
--   2. delete de projetos via RLS corrigido
--   3. member_permissions — permissões por membro + recurso (grupo)
--   4. activity_log — audit log de todas as ações
-- ============================================================

-- ── 1. VISIBILITY ───────────────────────────────────────────
-- Adiciona coluna visibility em cada tabela relevante
-- 'private'  → só o owner / admins veem
-- 'org'      → todos os membros da organização veem

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private', 'org'));

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'org'
  CHECK (visibility IN ('private', 'org'));

ALTER TABLE groups
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'org'
  CHECK (visibility IN ('private', 'org'));

ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'org'
  CHECK (visibility IN ('private', 'org'));

-- author_id já existe na v9 via INSERT mas vamos garantir a coluna
ALTER TABLE notes ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS last_edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;


-- ── 2. PROJECTS — garantir RLS para delete ──────────────────
-- O hook já tem deleteProject mas a RLS da v9 só cobria organizations
-- Recriamos a policy para projetos explicitamente

DROP POLICY IF EXISTS "owner_projects" ON projects;

CREATE POLICY "owner_projects" ON projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = projects.org_id
        AND o.owner_id = auth.uid()
    )
  );

-- Policy para membros admin lerem/escreverem projetos da org
DROP POLICY IF EXISTS "member_projects_read" ON projects;

CREATE POLICY "member_projects_read" ON projects
  FOR SELECT USING (
    -- owner já coberto acima
    EXISTS (
      SELECT 1 FROM org_members m
      WHERE m.org_id = projects.org_id
        AND m.user_id = auth.uid()
        AND (
          projects.visibility = 'org'
          OR m.role IN ('admin')
        )
    )
  );


-- ── 3. MEMBER_PERMISSIONS ────────────────────────────────────
-- Permissões por membro por recurso específico (grupo)
-- integration: 'github' | 'trello'
-- allowed: true/false

CREATE TABLE IF NOT EXISTS member_permissions (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN ('group', 'project', 'notes')),
  resource_id   uuid NOT NULL,        -- id do grupo / projeto
  integration   text CHECK (integration IN ('github', 'trello', 'all')),
  can_view      boolean DEFAULT true,
  can_edit      boolean DEFAULT false,
  can_integrate boolean DEFAULT false, -- pode usar integração GitHub/Trello neste recurso
  granted_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (org_id, user_id, resource_type, resource_id, integration)
);

ALTER TABLE member_permissions ENABLE ROW LEVEL SECURITY;

-- Só o owner/admin da org gerencia permissões
CREATE POLICY "owner_member_permissions" ON member_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = member_permissions.org_id
        AND o.owner_id = auth.uid()
    )
  );

-- Membros leem as próprias permissões
CREATE POLICY "self_member_permissions" ON member_permissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE TRIGGER trg_member_permissions_updated
  BEFORE UPDATE ON member_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 4. ACTIVITY_LOG ─────────────────────────────────────────
-- Audit log central para todas as entidades

CREATE TABLE IF NOT EXISTS activity_log (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action        text NOT NULL,       -- 'created' | 'updated' | 'deleted' | 'invited' | 'role_changed' | 'note_edited' | 'permission_changed'
  entity_type   text NOT NULL,       -- 'organization' | 'project' | 'group' | 'note' | 'member' | 'invite' | 'permission'
  entity_id     uuid,                -- id do recurso afetado
  entity_name   text,                -- snapshot do nome na hora do evento
  meta          jsonb DEFAULT '{}'::jsonb,  -- dados extras (ex: role anterior/novo, campos alterados)
  created_at    timestamptz DEFAULT now()
);

-- Índices para performance no painel /activity
CREATE INDEX IF NOT EXISTS activity_log_org_idx ON activity_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_user_idx ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_entity_idx ON activity_log(entity_type, entity_id);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Owner vê tudo na org
CREATE POLICY "owner_activity_log" ON activity_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = activity_log.org_id
        AND o.owner_id = auth.uid()
    )
  );

-- Membros admin veem o log
CREATE POLICY "admin_activity_log" ON activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM org_members m
      WHERE m.org_id = activity_log.org_id
        AND m.user_id = auth.uid()
        AND m.role = 'admin'
    )
  );

-- Qualquer membro inserir log (a lógica de o quê logar fica no app)
CREATE POLICY "member_insert_activity_log" ON activity_log
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM org_members m
      WHERE m.org_id = activity_log.org_id
        AND m.user_id = auth.uid()
    )
  );

-- Owner também pode inserir (não é membro, é dono)
CREATE POLICY "owner_insert_activity_log" ON activity_log
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = activity_log.org_id AND o.owner_id = auth.uid()
    )
  );


-- ── 5. ORG_MEMBERS — garantir tabela existe (v9 às vezes não cria) ──
-- Se a sua v9 já criou, os IF NOT EXISTS protegem

CREATE TABLE IF NOT EXISTS org_members (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role       text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at  timestamptz DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE TABLE IF NOT EXISTS org_invites (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'member', 'viewer')),
  token       uuid DEFAULT uuid_generate_v4() UNIQUE,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  expires_at  timestamptz DEFAULT now() + interval '7 days'
);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_org_members" ON org_members;
CREATE POLICY "owner_org_members" ON org_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = org_members.org_id AND o.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "self_org_members" ON org_members;
CREATE POLICY "self_org_members" ON org_members
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "owner_org_invites" ON org_invites;
CREATE POLICY "owner_org_invites" ON org_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = org_invites.org_id AND o.owner_id = auth.uid()
    )
  );


-- ── 6. FUNCTION: accept_invite ──────────────────────────────
CREATE OR REPLACE FUNCTION accept_invite(invite_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inv  org_invites%ROWTYPE;
  uid  uuid := auth.uid();
BEGIN
  SELECT * INTO inv
  FROM org_invites
  WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > now();

  IF inv.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Convite inválido ou expirado');
  END IF;

  INSERT INTO org_members (org_id, user_id, role, invited_by)
  VALUES (inv.org_id, uid, inv.role, inv.invited_by)
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE org_invites SET status = 'accepted' WHERE id = inv.id;

  RETURN jsonb_build_object('ok', true, 'org_id', inv.org_id, 'role', inv.role);
END;
$$;


-- ── RESUMO DE MIGRATIONS EXECUTADAS ─────────────────────────
-- v10: visibility, member_permissions, activity_log, accept_invite fn
-- Rode este script inteiro no SQL Editor do Supabase (dashboard > SQL Editor)
