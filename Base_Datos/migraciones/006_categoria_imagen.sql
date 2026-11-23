-- 006 · Imagen de categoría (CA-154-001). La cantidad de productos se calcula
-- en la consulta, no se guarda. Aplica SOLO en cenarepas_staging.
BEGIN;

DO $$
BEGIN
  IF current_database() <> 'cenarepas_staging' THEN
    RAISE EXCEPTION 'Migración bloqueada: solo se aplica en cenarepas_staging (base actual: %)', current_database();
  END IF;
END $$;

SET search_path TO cenarepas;

ALTER TABLE categoria_producto ADD COLUMN IF NOT EXISTS imagen_url VARCHAR(255);

COMMIT;
