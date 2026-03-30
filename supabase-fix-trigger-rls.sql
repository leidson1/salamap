-- ============================================
-- Fix urgente: trigger snapshot_mapa bloqueado por RLS
-- O trigger tenta INSERT em mapa_historico mas so tem policy SELECT
-- ============================================

-- Opcao 1: Fazer o trigger rodar com privilegios elevados (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION snapshot_mapa()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
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
