-- 003 · Rol Cliente y vínculo usuario ↔ cliente (HU-150)
-- Aplica SOLO en cenarepas_staging.
BEGIN;

DO $$
BEGIN
  IF current_database() <> 'cenarepas_staging' THEN
    RAISE EXCEPTION 'Migración bloqueada: solo se aplica en cenarepas_staging (base actual: %)', current_database();
  END IF;
END $$;

SET search_path TO cenarepas;

-- 1. Rol Cliente (sin permisos de módulos: usa solo el catálogo público y /mi/*)
INSERT INTO rol (nombre, descripcion, estado)
VALUES ('Cliente', 'Cliente que hace pedidos desde la aplicación móvil', 'Activo')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Datos del cliente que pide la matriz: tipo de documento, municipio y barrio,
--    más el vínculo 1 a 1 con su usuario (NULL para clientes creados por el personal).
ALTER TABLE cliente
  ADD COLUMN IF NOT EXISTS id_usuario      INTEGER,
  ADD COLUMN IF NOT EXISTS tipo_documento  VARCHAR(5) NOT NULL DEFAULT 'CC',
  ADD COLUMN IF NOT EXISTS municipio       VARCHAR(60),
  ADD COLUMN IF NOT EXISTS barrio          VARCHAR(80);

ALTER TABLE cliente
  ADD CONSTRAINT uq_cliente_usuario UNIQUE (id_usuario),
  ADD CONSTRAINT fk_cliente_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
  ADD CONSTRAINT ck_cliente_tipodocumento
    CHECK (tipo_documento IN ('CC', 'CE', 'NIT', 'PP', 'TI'));

-- Los documentos con dígito de verificación (900.555.444-1) son NIT.
UPDATE cliente SET tipo_documento = 'NIT' WHERE documento ~ '-[0-9]$';

-- 3. Correo único sin distinguir mayúsculas (CA-150-002). Hoy no hay duplicados.
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuario_correo_lower ON usuario (LOWER(correo));
CREATE UNIQUE INDEX IF NOT EXISTS ux_cliente_correo_lower ON cliente (LOWER(correo)) WHERE correo IS NOT NULL;

COMMIT;
