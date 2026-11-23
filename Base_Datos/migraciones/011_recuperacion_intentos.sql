-- 011 · Contador de intentos del código de recuperación de contraseña (f;
-- HU-003, HU-004). El código (6 dígitos, 15 minutos) se guarda como hash en
-- usuario.token_recuperacion y vence en usuario.token_expiracion, columnas que
-- ya existían. Al 5.º intento fallido el código se invalida.
-- Idempotente. Aplica SOLO en cenarepas_staging.
BEGIN;

DO $$
BEGIN
  IF current_database() <> 'cenarepas_staging' THEN
    RAISE EXCEPTION 'Migración bloqueada: solo se aplica en cenarepas_staging (base actual: %)', current_database();
  END IF;
END $$;

SET search_path TO cenarepas;

ALTER TABLE usuario ADD COLUMN IF NOT EXISTS recuperacion_intentos INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_usuario_recuperacion_intentos') THEN
    ALTER TABLE usuario ADD CONSTRAINT ck_usuario_recuperacion_intentos CHECK (recuperacion_intentos >= 0);
  END IF;
END $$;

COMMIT;
