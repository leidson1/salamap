-- SalaMap migration - 03 de maio de 2026
-- Endurece o compartilhamento publico e evita conflitos de links ativos por mapa.

DROP POLICY IF EXISTS "Anyone can read active shares" ON mapa_compartilhamentos;

CREATE UNIQUE INDEX IF NOT EXISTS mapa_compartilhamentos_unique_active_mapa_id
  ON mapa_compartilhamentos (mapa_id)
  WHERE ativo = TRUE;

CREATE OR REPLACE FUNCTION get_mapa_publico(p_share_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'mapa', jsonb_build_object(
      'id', m.id,
      'nome', m.nome,
      'linhas', m.linhas,
      'colunas', m.colunas,
      'layout_tipo', m.layout_tipo,
      'grid', m.grid,
      'mesa_professor', m.mesa_professor,
      'room_config', m.room_config,
      'updated_at', m.updated_at
    ),
    'turma', jsonb_build_object(
      'serie', t.serie,
      'turma', t.turma,
      'turno', t.turno
    ),
    'professor', jsonb_build_object(
      'nome', p.nome
    ),
    'alunos', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('id', a.id, 'nome', a.nome, 'numero', a.numero)
        ORDER BY a.numero
      ), '[]'::jsonb)
      FROM sala_alunos a
      WHERE a.turma_id = t.id AND a.ativo = TRUE
    )
  ) INTO result
  FROM mapa_compartilhamentos mc
  JOIN mapas m ON m.id = mc.mapa_id
  JOIN sala_turmas t ON t.id = m.turma_id
  JOIN profiles p ON p.id = m.user_id
  WHERE mc.share_code = p_share_code
    AND mc.ativo = TRUE;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION get_mapa_publico(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_mapa_publico(TEXT) TO anon, authenticated, service_role;
