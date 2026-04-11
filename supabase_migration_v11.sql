-- ============================================================
-- Atelier.sh — Migration v11
-- Novidades:
--   1. note_folders — tabela de pastas para anotações
--   2. notes.folder_id — coluna FK para pasta
--   3. RLS para note_folders
-- ============================================================

-- ── 1. TABELA note_folders ───────────────────────────────────
CREATE TABLE IF NOT EXISTS note_folders (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  group_id    uuid REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS note_folders_group_idx ON note_folders(group_id);
CREATE INDEX IF NOT EXISTS note_folders_org_idx ON note_folders(org_id);

ALTER TABLE note_folders ENABLE ROW LEVEL SECURITY;

-- Remove policies existentes antes de recriar
DROP POLICY IF EXISTS "owner_note_folders" ON note_folders;
DROP POLICY IF EXISTS "member_note_folders_select" ON note_folders;
DROP POLICY IF EXISTS "member_note_folders_insert" ON note_folders;
DROP POLICY IF EXISTS "member_note_folders_update" ON note_folders;
DROP POLICY IF EXISTS "member_note_folders_delete" ON note_folders;

-- Owner da org gerencia pastas
CREATE POLICY "owner_note_folders" ON note_folders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = note_folders.org_id
        AND o.owner_id = auth.uid()
    )
  );

-- Membros da org leem e criam pastas
CREATE POLICY "member_note_folders_select" ON note_folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM org_members m
      WHERE m.org_id = note_folders.org_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "member_note_folders_insert" ON note_folders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_members m
      WHERE m.org_id = note_folders.org_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "member_note_folders_update" ON note_folders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM org_members m
      WHERE m.org_id = note_folders.org_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'member')
    )
  );

CREATE POLICY "member_note_folders_delete" ON note_folders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM org_members m
      WHERE m.org_id = note_folders.org_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'member')
    )
    OR auth.uid() = created_by
  );

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_note_folders_updated ON note_folders;
CREATE TRIGGER trg_note_folders_updated
  BEFORE UPDATE ON note_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ── 2. COLUNA folder_id em notes ────────────────────────────
-- ON DELETE SET NULL: ao excluir uma pasta, as notas ficam sem pasta (não são apagadas)
ALTER TABLE notes
  ADD COLUMN IF NOT EXISTS folder_id uuid
  REFERENCES note_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS notes_folder_idx ON notes(folder_id);


-- ── RESUMO ───────────────────────────────────────────────────
-- v11: note_folders + notes.folder_id
-- Rode este script no SQL Editor do Supabase antes de publicar a v11 do app.
