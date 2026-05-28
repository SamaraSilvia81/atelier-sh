-- ============================================================
-- Atelier.sh — Migration v12
-- 1. avaliacoes_grupo  — notas por critério DT/DCU/PI por grupo
-- 2. avaliacoes_individual — critérios comportamentais
--    SEM CHECK constraint (permite qualquer string de criterio)
-- ============================================================

CREATE TABLE IF NOT EXISTS avaliacoes_grupo (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  group_id     uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  disciplina   text NOT NULL,
  fase         text NOT NULL,
  criterio_id  text NOT NULL,
  nota         numeric(5,2) NOT NULL DEFAULT 0 CHECK (nota >= 0),
  nota_max     numeric(5,2) NOT NULL CHECK (nota_max > 0),
  nivel        text, -- id do NIVEIS_AVALIACAO (completo, faltou_pouco, etc)
  atraso       text, -- id do PENALIZACOES_ATRASO (sem_atraso, atraso_1, etc)
  observacao   text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (group_id, disciplina, criterio_id)
);

CREATE INDEX IF NOT EXISTS avaliacoes_grupo_group_idx ON avaliacoes_grupo(group_id);
CREATE INDEX IF NOT EXISTS avaliacoes_grupo_org_idx   ON avaliacoes_grupo(org_id);

ALTER TABLE avaliacoes_grupo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_avaliacoes_grupo" ON avaliacoes_grupo;
CREATE POLICY "owner_avaliacoes_grupo" ON avaliacoes_grupo
  FOR ALL USING (
    EXISTS (SELECT 1 FROM organizations o WHERE o.id = avaliacoes_grupo.org_id AND o.owner_id = auth.uid())
  );

-- Tabela individual SEM CHECK constraint no criterio
CREATE TABLE IF NOT EXISTS avaliacoes_individual (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  group_id     uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  member_id    text NOT NULL,
  criterio     text NOT NULL, -- sem CHECK — aceita qualquer string
  nota         numeric(4,1) NOT NULL DEFAULT 0 CHECK (nota >= 0 AND nota <= 10),
  observacao   text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (group_id, member_id, criterio)
);

CREATE INDEX IF NOT EXISTS avaliacoes_ind_group_idx  ON avaliacoes_individual(group_id);
CREATE INDEX IF NOT EXISTS avaliacoes_ind_org_idx    ON avaliacoes_individual(org_id);
CREATE INDEX IF NOT EXISTS avaliacoes_ind_member_idx ON avaliacoes_individual(member_id);

ALTER TABLE avaliacoes_individual ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_avaliacoes_individual" ON avaliacoes_individual;
CREATE POLICY "owner_avaliacoes_individual" ON avaliacoes_individual
  FOR ALL USING (
    EXISTS (SELECT 1 FROM organizations o WHERE o.id = avaliacoes_individual.org_id AND o.owner_id = auth.uid())
  );

-- Se as tabelas já existem com o CHECK constraint antigo, remover
ALTER TABLE IF EXISTS avaliacoes_individual DROP CONSTRAINT IF EXISTS avaliacoes_individual_criterio_check;

-- Triggers updated_at
DROP TRIGGER IF EXISTS trg_avaliacoes_grupo_updated ON avaliacoes_grupo;
CREATE TRIGGER trg_avaliacoes_grupo_updated
  BEFORE UPDATE ON avaliacoes_grupo FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_avaliacoes_ind_updated ON avaliacoes_individual;
CREATE TRIGGER trg_avaliacoes_ind_updated
  BEFORE UPDATE ON avaliacoes_individual FOR EACH ROW EXECUTE FUNCTION update_updated_at();
