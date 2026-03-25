-- ============================================
-- MapaSala - Tabelas ADICIONAIS ao banco do ProvasCan
-- Rodar no mesmo projeto Supabase do ProvasCan
-- As tabelas profiles, turmas, alunos JA EXISTEM
-- ============================================

-- MAPAS (nova tabela - mapa de sala por turma)
CREATE TABLE mapas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id BIGINT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  turma_id BIGINT NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'Mapa de Sala',
  linhas INT NOT NULL DEFAULT 5,
  colunas INT NOT NULL DEFAULT 6,
  layout_tipo TEXT NOT NULL DEFAULT 'tradicional',
  grid JSONB NOT NULL DEFAULT '[]'::jsonb,
  mesa_professor JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(turma_id)
);

ALTER TABLE mapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own mapas" ON mapas
  FOR ALL USING (auth.uid() = user_id);

-- MAPA_COMPARTILHAMENTOS (nova tabela - links de compartilhamento)
CREATE TABLE mapa_compartilhamentos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mapa_id BIGINT NOT NULL REFERENCES mapas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  share_code TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mapa_compartilhamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own compartilhamentos" ON mapa_compartilhamentos
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read active shares" ON mapa_compartilhamentos
  FOR SELECT USING (ativo = TRUE);

-- MAPA_HISTORICO (nova tabela - snapshots automaticos)
CREATE TABLE mapa_historico (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mapa_id BIGINT NOT NULL REFERENCES mapas(id) ON DELETE CASCADE,
  grid JSONB NOT NULL,
  linhas INT NOT NULL,
  colunas INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mapa_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own history" ON mapa_historico
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mapas WHERE mapas.id = mapa_historico.mapa_id AND mapas.user_id = auth.uid()
    )
  );

-- Trigger: auto-snapshot quando mapa e atualizado
CREATE OR REPLACE FUNCTION snapshot_mapa()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.grid IS DISTINCT FROM NEW.grid THEN
    INSERT INTO mapa_historico (mapa_id, grid, linhas, colunas)
    VALUES (OLD.id, OLD.grid, OLD.linhas, OLD.colunas);
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_mapa_update
  BEFORE UPDATE ON mapas
  FOR EACH ROW EXECUTE FUNCTION snapshot_mapa();

-- FUNCAO PUBLICA: retorna mapa compartilhado (sem auth)
CREATE OR REPLACE FUNCTION get_mapa_publico(p_share_code TEXT)
RETURNS JSONB AS $$
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
      FROM alunos a
      WHERE a.turma_id = t.id AND a.ativo = TRUE
    )
  ) INTO result
  FROM mapa_compartilhamentos mc
  JOIN mapas m ON m.id = mc.mapa_id
  JOIN turmas t ON t.id = m.turma_id
  JOIN profiles p ON p.id = m.user_id
  WHERE mc.share_code = p_share_code
    AND mc.ativo = TRUE;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
