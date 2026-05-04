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
