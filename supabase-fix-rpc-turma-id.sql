-- Atualizar RPC pra retornar turma_id no mapa público
CREATE OR REPLACE FUNCTION get_mapa_publico(p_share_code TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'mapa', jsonb_build_object(
      'id', m.id,
      'turma_id', m.turma_id,
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
        jsonb_build_object('id', a.id, 'nome', a.nome, 'numero', a.numero, 'apelido', a.apelido)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
