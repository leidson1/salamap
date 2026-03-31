-- Solicitações de acesso a turmas
CREATE TABLE IF NOT EXISTS solicitacoes_acesso (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  turma_id BIGINT NOT NULL REFERENCES sala_turmas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente | aceito | recusado
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(turma_id, user_id)
);

ALTER TABLE solicitacoes_acesso ENABLE ROW LEVEL SECURITY;

-- Quem solicitou pode ver suas próprias solicitações
CREATE POLICY "User can see own requests" ON solicitacoes_acesso
  FOR SELECT USING (user_id = auth.uid());

-- Quem solicitou pode criar
CREATE POLICY "User can create request" ON solicitacoes_acesso
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Dono da turma pode ver e gerenciar
CREATE POLICY "Owner can manage requests" ON solicitacoes_acesso
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sala_turmas WHERE id = solicitacoes_acesso.turma_id AND user_id = auth.uid()
    )
  );
