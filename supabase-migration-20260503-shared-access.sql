-- ============================================
-- SalaMap migration - 03 de maio de 2026
-- Ajustes do compartilhamento direto
-- ============================================

-- Convidado pode sair do compartilhamento recebido
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'turma_compartilhamentos'
      AND policyname = 'Invitee can leave own share'
  ) THEN
    CREATE POLICY "Invitee can leave own share" ON turma_compartilhamentos
      FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- Evita duplicidade de compartilhamento aceito para o mesmo usuario
CREATE UNIQUE INDEX IF NOT EXISTS turma_compartilhamentos_unique_accepted_user
  ON turma_compartilhamentos (turma_id, user_id)
  WHERE user_id IS NOT NULL
    AND status = 'aceito';

-- Garante um link ativo para turmas que ja foram compartilhadas diretamente
INSERT INTO mapa_compartilhamentos (mapa_id, user_id, share_code, ativo)
SELECT
  m.id,
  m.user_id,
  encode(gen_random_bytes(8), 'hex'),
  TRUE
FROM mapas m
WHERE EXISTS (
  SELECT 1
  FROM turma_compartilhamentos tc
  WHERE tc.turma_id = m.turma_id
    AND tc.status = 'aceito'
)
AND NOT EXISTS (
  SELECT 1
  FROM mapa_compartilhamentos mc
  WHERE mc.mapa_id = m.id
    AND mc.ativo = TRUE
);

CREATE OR REPLACE FUNCTION ensure_share_code_for_direct_share()
RETURNS TRIGGER AS $$
DECLARE
  v_mapa_id BIGINT;
  v_owner_id UUID;
BEGIN
  IF NEW.status <> 'aceito' THEN
    RETURN NEW;
  END IF;

  SELECT id, user_id
    INTO v_mapa_id, v_owner_id
  FROM mapas
  WHERE turma_id = NEW.turma_id
  LIMIT 1;

  IF v_mapa_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM mapa_compartilhamentos
    WHERE mapa_id = v_mapa_id
      AND ativo = TRUE
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO mapa_compartilhamentos (mapa_id, user_id, share_code, ativo)
  VALUES (v_mapa_id, v_owner_id, encode(gen_random_bytes(8), 'hex'), TRUE)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS ensure_share_code_for_direct_share_trigger ON turma_compartilhamentos;

CREATE TRIGGER ensure_share_code_for_direct_share_trigger
  AFTER INSERT OR UPDATE OF status ON turma_compartilhamentos
  FOR EACH ROW
  EXECUTE FUNCTION ensure_share_code_for_direct_share();

-- Leitura consolidada para a caixa "Compartilhadas comigo"
CREATE OR REPLACE FUNCTION get_compartilhadas_comigo()
RETURNS TABLE (
  share_id BIGINT,
  turma_id BIGINT,
  papel TEXT,
  serie TEXT,
  turma TEXT,
  turno TEXT,
  owner_nome TEXT,
  share_code TEXT,
  has_map BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (tc.turma_id)
    tc.id AS share_id,
    tc.turma_id,
    tc.papel,
    t.serie,
    t.turma,
    t.turno,
    COALESCE(p.nome, ''),
    mc.share_code,
    (m.id IS NOT NULL) AS has_map
  FROM turma_compartilhamentos tc
  LEFT JOIN sala_turmas t ON t.id = tc.turma_id
  LEFT JOIN profiles p ON p.id = tc.convidado_por
  LEFT JOIN mapas m ON m.turma_id = tc.turma_id
  LEFT JOIN mapa_compartilhamentos mc
    ON mc.mapa_id = m.id
   AND mc.ativo = TRUE
  WHERE tc.user_id = auth.uid()
    AND tc.status = 'aceito'
  ORDER BY tc.turma_id, tc.created_at DESC, tc.id DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_compartilhadas_comigo() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_compartilhadas_comigo() TO authenticated, service_role;
