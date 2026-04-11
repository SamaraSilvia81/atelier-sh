-- ============================================================
-- Atelier.sh — Fix: accept_invite — ambiguidade de assinatura
-- Problema: existem duas versões da função no banco:
--   public.accept_invite(invite_token => text)
--   public.accept_invite(invite_token => uuid)
-- O Supabase RPC não consegue escolher qual usar e dá erro.
--
-- Solução: dropar AMBAS e recriar apenas uma versão
-- que recebe TEXT e converte para UUID internamente.
-- Assim funciona tanto com o token vindo da URL (string)
-- quanto com qualquer outro uso futuro.
-- ============================================================

-- 1. Remove as duas versões conflitantes
DROP FUNCTION IF EXISTS public.accept_invite(invite_token text);
DROP FUNCTION IF EXISTS public.accept_invite(invite_token uuid);

-- 2. Recria uma única versão que aceita TEXT
CREATE OR REPLACE FUNCTION public.accept_invite(invite_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inv  org_invites%ROWTYPE;
  uid  uuid := auth.uid();
  tok  uuid;
BEGIN
  -- Converte o texto para UUID com tratamento de erro
  BEGIN
    tok := invite_token::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN jsonb_build_object('error', 'Token invalido');
  END;

  -- Busca o convite valido
  SELECT * INTO inv
  FROM org_invites
  WHERE token = tok
    AND status = 'pending'
    AND expires_at > now();

  IF inv.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Convite invalido ou expirado');
  END IF;

  -- Verifica se o usuario esta autenticado
  IF uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Usuario nao autenticado');
  END IF;

  -- Insere o membro (ou atualiza o role se ja for membro)
  INSERT INTO org_members (org_id, user_id, role, invited_by)
  VALUES (inv.org_id, uid, inv.role, inv.invited_by)
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Marca o convite como aceito
  UPDATE org_invites SET status = 'accepted' WHERE id = inv.id;

  RETURN jsonb_build_object(
    'ok',     true,
    'org_id', inv.org_id,
    'role',   inv.role
  );
END;
$$;

-- 3. Garante que a funcao so pode ser chamada por usuarios autenticados
REVOKE ALL ON FUNCTION public.accept_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;
