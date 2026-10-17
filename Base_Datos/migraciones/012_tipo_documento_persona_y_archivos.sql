-- 012 · Tipo de documento y tipo de persona; archivos en Cloudinary.
-- 1. usuario: tipo y número de documento (opcionales: los usuarios existentes
--    no los tienen). Documento único cuando existe.
-- 2. cliente y proveedor: tipo de persona (Natural / Jurídica), nombres y
--    apellidos (Natural) o razón social (Jurídica). La columna `nombre` se
--    conserva y el backend la sigue llenando (nombres + apellidos o razón
--    social, máximo 150 = 75 + 1 + 74): la usan la app móvil, el registro,
--    los pedidos y los reportes.
-- 3. proveedor: tipo de documento; `nit` sigue siendo el número de documento.
-- 4. Archivos en Cloudinary: public_id para borrar el anterior al reemplazar o
--    eliminar, y el tipo de recurso de la factura de la compra (image o raw).
-- Idempotente. Aplica SOLO en cenarepas_staging.
BEGIN;

DO $$
BEGIN
  IF current_database() <> 'cenarepas_staging' THEN
    RAISE EXCEPTION 'Migración bloqueada: solo se aplica en cenarepas_staging (base actual: %)', current_database();
  END IF;
END $$;

SET search_path TO cenarepas;

-- 1. Usuarios
ALTER TABLE usuario
  ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(5),
  ADD COLUMN IF NOT EXISTS documento      VARCHAR(20);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_usuario_tipodocumento') THEN
    ALTER TABLE usuario ADD CONSTRAINT ck_usuario_tipodocumento
      CHECK (tipo_documento IS NULL OR tipo_documento IN ('CC', 'CE', 'NIT', 'PP', 'TI'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_usuario_documento_completo') THEN
    ALTER TABLE usuario ADD CONSTRAINT ck_usuario_documento_completo
      CHECK ((tipo_documento IS NULL) = (documento IS NULL));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_usuario_documento ON usuario (documento) WHERE documento IS NOT NULL;

-- 2. Clientes
ALTER TABLE cliente
  ADD COLUMN IF NOT EXISTS tipo_persona VARCHAR(10) NOT NULL DEFAULT 'Natural',
  ADD COLUMN IF NOT EXISTS nombres      VARCHAR(75),
  ADD COLUMN IF NOT EXISTS apellidos    VARCHAR(74),
  ADD COLUMN IF NOT EXISTS razon_social VARCHAR(150);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_cliente_tipopersona') THEN
    ALTER TABLE cliente ADD CONSTRAINT ck_cliente_tipopersona CHECK (tipo_persona IN ('Natural', 'Jurídica'));
  END IF;
END $$;

-- Los clientes con NIT pasan a Jurídica con su nombre como razón social; los
-- demás quedan Natural con el nombre completo en `nombres` (se puede separar
-- después al editarlos). Solo filas aún sin completar: idempotente.
UPDATE cliente SET tipo_persona = 'Jurídica', razon_social = nombre
 WHERE tipo_documento = 'NIT' AND razon_social IS NULL AND nombres IS NULL;
UPDATE cliente SET nombres = nombre
 WHERE tipo_persona = 'Natural' AND nombres IS NULL AND razon_social IS NULL;

-- 3. Proveedores (hoy todos tienen NIT: quedan Jurídica con su nombre como razón social)
ALTER TABLE proveedor
  ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(5)  NOT NULL DEFAULT 'NIT',
  ADD COLUMN IF NOT EXISTS tipo_persona   VARCHAR(10) NOT NULL DEFAULT 'Jurídica',
  ADD COLUMN IF NOT EXISTS nombres        VARCHAR(75),
  ADD COLUMN IF NOT EXISTS apellidos      VARCHAR(74),
  ADD COLUMN IF NOT EXISTS razon_social   VARCHAR(150);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_proveedor_tipodocumento') THEN
    ALTER TABLE proveedor ADD CONSTRAINT ck_proveedor_tipodocumento CHECK (tipo_documento IN ('CC', 'CE', 'NIT', 'PP', 'TI'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_proveedor_tipopersona') THEN
    ALTER TABLE proveedor ADD CONSTRAINT ck_proveedor_tipopersona CHECK (tipo_persona IN ('Natural', 'Jurídica'));
  END IF;
END $$;

UPDATE proveedor SET razon_social = nombre
 WHERE tipo_persona = 'Jurídica' AND razon_social IS NULL AND nombres IS NULL;

COMMENT ON COLUMN proveedor.nit IS 'Número de documento del proveedor (su tipo está en tipo_documento)';

-- 4. Archivos en Cloudinary
ALTER TABLE producto           ADD COLUMN IF NOT EXISTS imagen_public_id VARCHAR(255);
ALTER TABLE categoria_producto ADD COLUMN IF NOT EXISTS imagen_public_id VARCHAR(255);
ALTER TABLE compra
  ADD COLUMN IF NOT EXISTS comprobante_public_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS comprobante_recurso   VARCHAR(10);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_compra_comprobante_recurso') THEN
    ALTER TABLE compra ADD CONSTRAINT ck_compra_comprobante_recurso
      CHECK (comprobante_recurso IS NULL OR comprobante_recurso IN ('image', 'raw'));
  END IF;
END $$;

COMMIT;
