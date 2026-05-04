-- ============================================
-- SalaMap migration - 03 de maio de 2026
-- Central de acessos e membros
-- ============================================

CREATE OR REPLACE FUNCTION ensure_active_share_code_for_turma(p_turma_id BIGINT)
RETURNS TEXT AS $$
DECLARE
  v_mapa_id BIGINT;
  v_owner_id UUID;
  v_share_id BIGINT;
  v_share_code TEXT;
BEGIN
  SELECT id, user_id
    INTO v_mapa_id, v_owner_id
  FROM mapas
  WHERE turma_id = p_turma_id
  LIMIT 1;

  IF v_mapa_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, share_code
    INTO v_share_id, v_share_code
  FROM mapa_compartilhamentos
  WHERE mapa_id = v_mapa_id
    AND ativo = TRUE
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  IF v_share_code IS NOT NULL THEN
    RETURN v_share_code;
  END IF;

  SELECT id, share_code
    INTO v_share_id, v_share_code
  FROM mapa_compartilhamentos
  WHERE mapa_id = v_mapa_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  IF v_share_id IS NOT NULL THEN
    UPDATE mapa_compartilhamentos
    SET ativo = TRUE
    WHERE id = v_share_id;

    RETURN v_share_code;
  END IF;

  INSERT INTO mapa_compartilhamentos (mapa_id, user_id, share_code, ativo)
  VALUES (v_mapa_id, v_owner_id, encode(gen_random_bytes(8), 'hex'), TRUE)
  RETURNING share_code INTO v_share_code;

  RETURN v_share_code;
EXCEPTION
  WHEN unique_violation THEN
    SELECT share_code
      INTO v_share_code
    FROM mapa_compartilhamentos
    WHERE mapa_id = v_mapa_id
      AND ativo = TRUE
    ORDER BY created_at DESC, id DESC
    LIMIT 1;

    RETURN v_share_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION ensure_active_share_code_for_turma(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ensure_active_share_code_for_turma(BIGINT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION ensure_share_code_for_direct_share()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'aceito' THEN
    PERFORM ensure_active_share_code_for_turma(NEW.turma_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS ensure_share_code_for_direct_share_trigger ON turma_compartilhamentos;

CREATE TRIGGER ensure_share_code_for_direct_share_trigger
  AFTER INSERT OR UPDATE OF status ON turma_compartilhamentos
  FOR EACH ROW
  EXECUTE FUNCTION ensure_share_code_for_direct_share();

CREATE OR REPLACE FUNCTION list_minhas_solicitacoes_acesso()
RETURNS TABLE (
  request_id BIGINT,
  turma_id BIGINT,
  turma_serie TEXT,
  turma_nome TEXT,
  turma_turno TEXT,
  requester_id UUID,
  requester_nome TEXT,
  requester_email TEXT,
  requested_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.id,
    sa.turma_id,
    t.serie,
    t.turma,
    t.turno,
    sa.user_id,
    COALESCE(NULLIF(TRIM(p.nome), ''), 'Usuario'),
    COALESCE(NULLIF(TRIM(p.email), ''), ''),
    sa.created_at
  FROM solicitacoes_acesso sa
  JOIN sala_turmas t ON t.id = sa.turma_id
  LEFT JOIN profiles p ON p.id = sa.user_id
  WHERE sa.status = 'pendente'
    AND t.user_id = auth.uid()
  ORDER BY sa.created_at DESC, sa.id DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION list_minhas_solicitacoes_acesso() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_minhas_solicitacoes_acesso() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION list_meus_membros_turma()
RETURNS TABLE (
  share_id BIGINT,
  turma_id BIGINT,
  turma_serie TEXT,
  turma_nome TEXT,
  turma_turno TEXT,
  member_user_id UUID,
  member_nome TEXT,
  member_email TEXT,
  papel TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.turma_id,
    t.serie,
    t.turma,
    t.turno,
    tc.user_id,
    COALESCE(
      NULLIF(TRIM(p.nome), ''),
      CASE
        WHEN tc.user_id IS NULL THEN 'Convite pendente'
        ELSE 'Usuario'
      END
    ),
    COALESCE(NULLIF(TRIM(tc.email), ''), COALESCE(NULLIF(TRIM(p.email), ''), '')),
    tc.papel,
    tc.status,
    tc.created_at
  FROM turma_compartilhamentos tc
  JOIN sala_turmas t ON t.id = tc.turma_id
  LEFT JOIN profiles p ON p.id = tc.user_id
  WHERE t.user_id = auth.uid()
    AND t.ativo = TRUE
  ORDER BY t.serie, t.turma, tc.status, tc.created_at DESC, tc.id DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION list_meus_membros_turma() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_meus_membros_turma() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION approve_turma_access_request(p_request_id BIGINT)
RETURNS TABLE (
  share_id BIGINT,
  turma_id BIGINT,
  user_id UUID,
  email TEXT,
  share_code TEXT
) AS $$
DECLARE
  v_request RECORD;
  v_email TEXT;
  v_share_id BIGINT;
  v_share_code TEXT;
BEGIN
  SELECT
    sa.id,
    sa.turma_id,
    sa.user_id
  INTO v_request
  FROM solicitacoes_acesso sa
  JOIN sala_turmas t ON t.id = sa.turma_id
  WHERE sa.id = p_request_id
    AND sa.status = 'pendente'
    AND t.user_id = auth.uid()
  LIMIT 1;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Solicitacao nao encontrada ou sem permissao.';
  END IF;

  SELECT COALESCE(NULLIF(TRIM(p.email), ''), '')
    INTO v_email
  FROM profiles p
  WHERE p.id = v_request.user_id;

  SELECT tc.id
    INTO v_share_id
  FROM turma_compartilhamentos tc
  WHERE tc.turma_id = v_request.turma_id
    AND tc.user_id = v_request.user_id
    AND tc.status = 'aceito'
  LIMIT 1;

  IF v_share_id IS NOT NULL THEN
    UPDATE turma_compartilhamentos
    SET
      papel = 'editor',
      convidado_por = auth.uid(),
      email = CASE
        WHEN v_email <> '' THEN v_email
        ELSE turma_compartilhamentos.email
      END
    WHERE id = v_share_id;
  ELSE
    BEGIN
      INSERT INTO turma_compartilhamentos (
        turma_id,
        user_id,
        email,
        papel,
        status,
        convidado_por
      )
      VALUES (
        v_request.turma_id,
        v_request.user_id,
        v_email,
        'editor',
        'aceito',
        auth.uid()
      )
      RETURNING id INTO v_share_id;
    EXCEPTION
      WHEN unique_violation THEN
        SELECT tc.id
          INTO v_share_id
        FROM turma_compartilhamentos tc
        WHERE tc.turma_id = v_request.turma_id
          AND tc.user_id = v_request.user_id
          AND tc.status = 'aceito'
        LIMIT 1;

        UPDATE turma_compartilhamentos
        SET
          papel = 'editor',
          convidado_por = auth.uid(),
          email = CASE
            WHEN v_email <> '' THEN v_email
            ELSE turma_compartilhamentos.email
          END
        WHERE id = v_share_id;
    END;
  END IF;

  UPDATE solicitacoes_acesso
  SET status = 'aceito'
  WHERE id = v_request.id;

  v_share_code := ensure_active_share_code_for_turma(v_request.turma_id);

  RETURN QUERY
  SELECT
    v_share_id,
    v_request.turma_id,
    v_request.user_id,
    v_email,
    v_share_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION approve_turma_access_request(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_turma_access_request(BIGINT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION reject_turma_access_request(p_request_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
  v_request_id BIGINT;
BEGIN
  SELECT sa.id
    INTO v_request_id
  FROM solicitacoes_acesso sa
  JOIN sala_turmas t ON t.id = sa.turma_id
  WHERE sa.id = p_request_id
    AND sa.status = 'pendente'
    AND t.user_id = auth.uid()
  LIMIT 1;

  IF v_request_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE solicitacoes_acesso
  SET status = 'recusado'
  WHERE id = v_request_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION reject_turma_access_request(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reject_turma_access_request(BIGINT) TO authenticated, service_role;
