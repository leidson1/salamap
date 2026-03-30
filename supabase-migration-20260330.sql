-- ============================================
-- SalaMap migration - 30 de marco de 2026
-- Fase 2: Compartilhamento de turma entre usuarios
-- Fase 3: Historico com quem salvou
-- Fase 4: Escola / Workspace
-- ============================================

-- =====================
-- FASE 2: Compartilhamento de turmas
-- =====================

CREATE TABLE turma_compartilhamentos (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  turma_id BIGINT NOT NULL REFERENCES sala_turmas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,  -- NULL se ainda nao cadastrou
  email TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'editor',  -- editor | visualizador
  status TEXT NOT NULL DEFAULT 'pendente',  -- pendente | aceito
  convite_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  convidado_por UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE turma_compartilhamentos ENABLE ROW LEVEL SECURITY;

-- Dono da turma pode gerenciar convites
CREATE POLICY "Owner can manage turma shares" ON turma_compartilhamentos
  FOR ALL USING (
    convidado_por = auth.uid()
    OR EXISTS (
      SELECT 1 FROM sala_turmas WHERE id = turma_compartilhamentos.turma_id AND user_id = auth.uid()
    )
  );

-- Convidado pode ver seus proprios convites
CREATE POLICY "Invitee can see own shares" ON turma_compartilhamentos
  FOR SELECT USING (user_id = auth.uid());

-- Convidado pode aceitar seu convite
CREATE POLICY "Invitee can accept own invite" ON turma_compartilhamentos
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS: permitir acesso a turma/alunos/mapas para membros compartilhados
CREATE POLICY "Shared users can read turma" ON sala_turmas
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM turma_compartilhamentos tc
      WHERE tc.turma_id = sala_turmas.id
        AND tc.user_id = auth.uid()
        AND tc.status = 'aceito'
    )
  );

CREATE POLICY "Shared users can read alunos" ON sala_alunos
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM turma_compartilhamentos tc
      WHERE tc.turma_id = sala_alunos.turma_id
        AND tc.user_id = auth.uid()
        AND tc.status = 'aceito'
    )
  );

CREATE POLICY "Shared editors can update alunos" ON sala_alunos
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM turma_compartilhamentos tc
      WHERE tc.turma_id = sala_alunos.turma_id
        AND tc.user_id = auth.uid()
        AND tc.status = 'aceito'
        AND tc.papel = 'editor'
    )
  );

CREATE POLICY "Shared users can read mapas" ON mapas
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM turma_compartilhamentos tc
      WHERE tc.turma_id = mapas.turma_id
        AND tc.user_id = auth.uid()
        AND tc.status = 'aceito'
    )
  );

CREATE POLICY "Shared editors can update mapas" ON mapas
  FOR UPDATE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM turma_compartilhamentos tc
      WHERE tc.turma_id = mapas.turma_id
        AND tc.user_id = auth.uid()
        AND tc.status = 'aceito'
        AND tc.papel = 'editor'
    )
  );

-- Funcao publica para aceitar convite por token (sem auth necessario no momento do cadastro)
CREATE OR REPLACE FUNCTION aceitar_convite(p_token TEXT, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_turma_id BIGINT;
BEGIN
  UPDATE turma_compartilhamentos
  SET user_id = p_user_id, status = 'aceito'
  WHERE convite_token = p_token AND status = 'pendente'
  RETURNING turma_id INTO v_turma_id;

  RETURN v_turma_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funcao para aceitar convites pendentes por email (chamada apos login/cadastro)
CREATE OR REPLACE FUNCTION vincular_convites_pendentes()
RETURNS VOID AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN RETURN; END IF;

  UPDATE turma_compartilhamentos
  SET user_id = auth.uid(), status = 'aceito'
  WHERE email = v_email AND status = 'pendente' AND user_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- FASE 3: Historico com quem salvou
-- =====================

ALTER TABLE mapa_historico
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);

ALTER TABLE mapa_historico
  ADD COLUMN IF NOT EXISTS resumo TEXT;

-- Permitir membros compartilhados ver historico
CREATE POLICY "Shared users can read history" ON mapa_historico
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mapas WHERE mapas.id = mapa_historico.mapa_id AND mapas.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM mapas m
      JOIN turma_compartilhamentos tc ON tc.turma_id = m.turma_id
      WHERE m.id = mapa_historico.mapa_id
        AND tc.user_id = auth.uid()
        AND tc.status = 'aceito'
    )
  );

-- =====================
-- FASE 4: Escola / Workspace
-- =====================

CREATE TABLE escolas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo_convite TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  criado_por UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE escolas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read escola" ON escolas
  FOR SELECT USING (
    criado_por = auth.uid()
    OR EXISTS (
      SELECT 1 FROM escola_membros WHERE escola_id = escolas.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Creator can manage escola" ON escolas
  FOR ALL USING (criado_por = auth.uid());

CREATE TABLE escola_membros (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  escola_id BIGINT NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  papel TEXT NOT NULL DEFAULT 'professor',  -- coordenador | professor
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(escola_id, user_id)
);

ALTER TABLE escola_membros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read membros" ON escola_membros
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM escola_membros em2 WHERE em2.escola_id = escola_membros.escola_id AND em2.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM escolas WHERE id = escola_membros.escola_id AND criado_por = auth.uid()
    )
  );

CREATE POLICY "Coordenador can manage membros" ON escola_membros
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM escolas WHERE id = escola_membros.escola_id AND criado_por = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM escola_membros em2
      WHERE em2.escola_id = escola_membros.escola_id
        AND em2.user_id = auth.uid()
        AND em2.papel = 'coordenador'
    )
  );

-- Vincular turma a uma escola (opcional)
ALTER TABLE sala_turmas
  ADD COLUMN IF NOT EXISTS escola_id BIGINT REFERENCES escolas(id) ON DELETE SET NULL;

-- Funcao para entrar na escola por codigo de convite
CREATE OR REPLACE FUNCTION entrar_escola(p_codigo TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_escola_id BIGINT;
BEGIN
  SELECT id INTO v_escola_id FROM escolas WHERE codigo_convite = p_codigo;
  IF v_escola_id IS NULL THEN RETURN FALSE; END IF;

  INSERT INTO escola_membros (escola_id, user_id, papel)
  VALUES (v_escola_id, auth.uid(), 'professor')
  ON CONFLICT (escola_id, user_id) DO NOTHING;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
