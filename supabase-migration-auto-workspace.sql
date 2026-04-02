-- ============================================
-- SalaMap: Workspace automático no signup
-- Quando um usuário se cadastra, cria escola + membro automaticamente
-- Baseado no modelo do ProvasCan
-- ============================================

-- Função helper: retorna IDs das escolas do usuário
CREATE OR REPLACE FUNCTION user_escolas(uid UUID)
RETURNS SETOF BIGINT AS $$
  SELECT escola_id FROM escola_membros WHERE user_id = uid
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Função helper: retorna IDs das escolas que o usuário gerencia (dono/coordenador)
CREATE OR REPLACE FUNCTION user_managed_escolas(uid UUID)
RETURNS SETOF BIGINT AS $$
  SELECT escola_id FROM escola_membros WHERE user_id = uid AND papel IN ('coordenador')
  UNION
  SELECT id FROM escolas WHERE criado_por = uid
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Trigger: auto-criar escola no signup
CREATE OR REPLACE FUNCTION handle_new_user_salamap()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_escola_id BIGINT;
BEGIN
  -- Nome do usuário (do metadata do signup)
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));

  -- Criar perfil (se não existir — pode já ter sido criado pelo ProvasCan)
  INSERT INTO profiles (id, nome, email)
  VALUES (NEW.id, v_nome, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Criar escola automaticamente
  INSERT INTO escolas (nome, criado_por)
  VALUES (v_nome, NEW.id)
  RETURNING id INTO v_escola_id;

  -- Adicionar como membro coordenador
  INSERT INTO escola_membros (escola_id, user_id, papel)
  VALUES (v_escola_id, NEW.id, 'coordenador');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar se já existe trigger do ProvasCan
-- Se existir, criar um trigger separado que roda DEPOIS
DO $$
BEGIN
  -- Tentar criar o trigger (pode falhar se nome já existe)
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_salamap'
  ) THEN
    CREATE TRIGGER on_auth_user_created_salamap
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user_salamap();
  END IF;
END$$;
