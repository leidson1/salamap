-- SalaMap migration - 26 de marco de 2026
-- Aplica correcoes no historico de mapas e no carimbo de updated_at.

ALTER TABLE mapa_historico
  ADD COLUMN IF NOT EXISTS layout_tipo TEXT;

ALTER TABLE mapa_historico
  ADD COLUMN IF NOT EXISTS mesa_professor JSONB;

ALTER TABLE mapa_historico
  ADD COLUMN IF NOT EXISTS room_config JSONB;

UPDATE mapa_historico
SET layout_tipo = 'tradicional'
WHERE layout_tipo IS NULL;

ALTER TABLE mapa_historico
  ALTER COLUMN layout_tipo SET DEFAULT 'tradicional';

ALTER TABLE mapa_historico
  ALTER COLUMN layout_tipo SET NOT NULL;

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
