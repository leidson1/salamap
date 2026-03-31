-- Adicionar campo apelido na tabela de alunos
-- Usado para identificar alunos com nomes iguais na carteira
ALTER TABLE sala_alunos ADD COLUMN IF NOT EXISTS apelido TEXT;
