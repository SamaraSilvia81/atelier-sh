-- ============================================================
-- Atelier.sh — Migration v13
-- 1. avaliacoes_contribuicao — fator individual por fase
-- 2. avaliacoes_comportamental — registro qualitativo
-- 3. avaliacoes_extra — nota extra manual
-- 4. avaliacoes_criterios_custom — CRUD de critérios/fases
-- ============================================================

-- ── 1. CONTRIBUIÇÃO INDIVIDUAL ───────────────────────────────
CREATE TABLE IF NOT EXISTS avaliacoes_contribuicao (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id         uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  group_id       uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  member_id      text NOT NULL,
  disciplina     text NOT NULL,
  fase           text NOT NULL,
  fator          text NOT NULL CHECK (fator IN ('liderou','participou','participou_pouco','nao_participou')),
  nota_calculada numeric(5,2),
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now(),
  UNIQUE (group_id, member_id, disciplina, fase)
);

CREATE INDEX IF NOT EXISTS avcontrib_group_idx  ON avaliacoes_contribuicao(group_id);
CREATE INDEX IF NOT EXISTS avcontrib_member_idx ON avaliacoes_contribuicao(member_id);

ALTER TABLE avaliacoes_contribuicao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_contribuicao" ON avaliacoes_contribuicao;
CREATE POLICY "owner_contribuicao" ON avaliacoes_contribuicao FOR ALL USING (
  EXISTS (SELECT 1 FROM organizations o WHERE o.id = avaliacoes_contribuicao.org_id AND o.owner_id = auth.uid())
);

DROP TRIGGER IF EXISTS trg_contribuicao_updated ON avaliacoes_contribuicao;
CREATE TRIGGER trg_contribuicao_updated
  BEFORE UPDATE ON avaliacoes_contribuicao FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 2. COMPORTAMENTAL ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS avaliacoes_comportamental (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  group_id   uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  member_id  text NOT NULL,
  criterio   text NOT NULL,
  registro   text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (group_id, member_id, criterio)
);

CREATE INDEX IF NOT EXISTS avcomport_group_idx  ON avaliacoes_comportamental(group_id);
CREATE INDEX IF NOT EXISTS avcomport_member_idx ON avaliacoes_comportamental(member_id);

ALTER TABLE avaliacoes_comportamental ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_comportamental" ON avaliacoes_comportamental;
CREATE POLICY "owner_comportamental" ON avaliacoes_comportamental FOR ALL USING (
  EXISTS (SELECT 1 FROM organizations o WHERE o.id = avaliacoes_comportamental.org_id AND o.owner_id = auth.uid())
);

DROP TRIGGER IF EXISTS trg_comportamental_updated ON avaliacoes_comportamental;
CREATE TRIGGER trg_comportamental_updated
  BEFORE UPDATE ON avaliacoes_comportamental FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 3. NOTA EXTRA ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS avaliacoes_extra (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id     uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  group_id   uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  member_id  text NOT NULL,
  descricao  text NOT NULL,
  valor      numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS avextra_group_idx  ON avaliacoes_extra(group_id);
CREATE INDEX IF NOT EXISTS avextra_member_idx ON avaliacoes_extra(member_id);

ALTER TABLE avaliacoes_extra ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_extra" ON avaliacoes_extra;
CREATE POLICY "owner_extra" ON avaliacoes_extra FOR ALL USING (
  EXISTS (SELECT 1 FROM organizations o WHERE o.id = avaliacoes_extra.org_id AND o.owner_id = auth.uid())
);

DROP TRIGGER IF EXISTS trg_extra_updated ON avaliacoes_extra;
CREATE TRIGGER trg_extra_updated
  BEFORE UPDATE ON avaliacoes_extra FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 4. CRITÉRIOS CUSTOMIZADOS (CRUD das fases) ───────────────
CREATE TABLE IF NOT EXISTS avaliacoes_criterios_custom (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  group_id     uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  disciplina   text NOT NULL,
  fase_nome    text NOT NULL,
  criterio_id  text NOT NULL,
  criterio_nome text NOT NULL,
  nota_max     numeric(5,2) NOT NULL DEFAULT 1.0,
  ordem        integer NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (group_id, disciplina, criterio_id)
);

CREATE INDEX IF NOT EXISTS avcustom_group_idx ON avaliacoes_criterios_custom(group_id);
CREATE INDEX IF NOT EXISTS avcustom_disc_idx  ON avaliacoes_criterios_custom(disciplina);

ALTER TABLE avaliacoes_criterios_custom ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_criterios_custom" ON avaliacoes_criterios_custom;
CREATE POLICY "owner_criterios_custom" ON avaliacoes_criterios_custom FOR ALL USING (
  EXISTS (SELECT 1 FROM organizations o WHERE o.id = avaliacoes_criterios_custom.org_id AND o.owner_id = auth.uid())
);

DROP TRIGGER IF EXISTS trg_custom_updated ON avaliacoes_criterios_custom;
CREATE TRIGGER trg_custom_updated
  BEFORE UPDATE ON avaliacoes_criterios_custom FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Remover CHECK constraint antigo se existir
ALTER TABLE IF EXISTS avaliacoes_individual DROP CONSTRAINT IF EXISTS avaliacoes_individual_criterio_check;
