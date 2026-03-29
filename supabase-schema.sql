-- ============================================
-- SalaMap - Schema Supabase
-- Roda no MESMO projeto Supabase do ProvasCan
-- Compartilha: profiles (auth)
-- Independente: sala_turmas, sala_alunos, mapas
-- ============================================

-- SALA_TURMAS (turmas independentes do SalaMap)
CREATE TABLE sala_turmas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  serie TEXT NOT NULL,
  turma TEXT NOT NULL,
  turno TEXT NOT NULL DEFAULT 'Manha',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sala_turmas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own sala_turmas" ON sala_turmas
  FOR ALL USING (auth.uid() = user_id);

-- SALA_ALUNOS (alunos independentes do SalaMap)
CREATE TABLE sala_alunos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  turma_id BIGINT NOT NULL REFERENCES sala_turmas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  numero INT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sala_alunos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own sala_alunos" ON sala_alunos
  FOR ALL USING (auth.uid() = user_id);

-- MAPAS (mapa de sala por turma)
CREATE TABLE mapas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  turma_id BIGINT NOT NULL REFERENCES sala_turmas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'Mapa de Sala',
  linhas INT NOT NULL DEFAULT 5,
  colunas INT NOT NULL DEFAULT 6,
  layout_tipo TEXT NOT NULL DEFAULT 'tradicional',
  grid JSONB NOT NULL DEFAULT '[]'::jsonb,
  mesa_professor JSONB,
  room_config JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(turma_id)
);

ALTER TABLE mapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own mapas" ON mapas
  FOR ALL USING (auth.uid() = user_id);

-- MAPA_COMPARTILHAMENTOS (links de compartilhamento)
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

-- MAPA_HISTORICO (snapshots automaticos)
CREATE TABLE mapa_historico (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mapa_id BIGINT NOT NULL REFERENCES mapas(id) ON DELETE CASCADE,
  grid JSONB NOT NULL,
  linhas INT NOT NULL,
  colunas INT NOT NULL,
  layout_tipo TEXT NOT NULL DEFAULT 'tradicional',
  mesa_professor JSONB,
  room_config JSONB,
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
  IF OLD.grid IS DISTINCT FROM NEW.grid
    OR OLD.linhas IS DISTINCT FROM NEW.linhas
    OR OLD.colunas IS DISTINCT FROM NEW.colunas
    OR OLD.layout_tipo IS DISTINCT FROM NEW.layout_tipo
    OR OLD.mesa_professor IS DISTINCT FROM NEW.mesa_professor
    OR OLD.room_config IS DISTINCT FROM NEW.room_config
  THEN
    INSERT INTO mapa_historico (
      mapa_id,
      grid,
      linhas,
      colunas,
      layout_tipo,
      mesa_professor,
      room_config
    )
    VALUES (
      OLD.id,
      OLD.grid,
      OLD.linhas,
      OLD.colunas,
      OLD.layout_tipo,
      OLD.mesa_professor,
      OLD.room_config
    );
    NEW.updated_at = now();
  ELSIF OLD.nome IS DISTINCT FROM NEW.nome THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
