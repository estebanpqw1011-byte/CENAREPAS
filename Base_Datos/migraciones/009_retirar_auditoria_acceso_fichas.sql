-- 009 · Retira la tabla auditoria_acceso_fichas (2026-09-28). La creó una
-- migración 008 que no fue aprobada y se revirtió (commit 84c5168): exponía
-- a cualquier rol con fichas-tecnicas:ver el correo, la IP y el navegador de
-- quien consultaba cada receta. Ningún código la usa ya.
-- IF EXISTS: también corre en una base nueva, donde la 008 nunca existió.
-- Idempotente. Aplica SOLO en cenarepas_staging.
BEGIN;

DO $$
BEGIN
  IF current_database() <> 'cenarepas_staging' THEN
    RAISE EXCEPTION 'Migración bloqueada: solo se aplica en cenarepas_staging (base actual: %)', current_database();
  END IF;
END $$;

SET search_path TO cenarepas;

-- Borra también sus índices y su secuencia (no hay tablas que dependan de ella).
DROP TABLE IF EXISTS auditoria_acceso_fichas;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'cenarepas' AND table_name = 'auditoria_acceso_fichas'
  ) THEN
    RAISE EXCEPTION 'La tabla auditoria_acceso_fichas sigue existiendo';
  END IF;
END $$;

COMMIT;
