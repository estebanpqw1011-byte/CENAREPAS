-- 004 · Créditos y abonos (HU-117, HU-161, HU-166, HU-167, HU-171)
-- Un crédito nace de un pedido pagado con abono. Los abonos del cliente quedan
-- "En revisión" hasta que el personal los aprueba o rechaza. Nada se borra:
-- los abonos se anulan. Aplica SOLO en cenarepas_staging.
BEGIN;

DO $$
BEGIN
  IF current_database() <> 'cenarepas_staging' THEN
    RAISE EXCEPTION 'Migración bloqueada: solo se aplica en cenarepas_staging (base actual: %)', current_database();
  END IF;
END $$;

SET search_path TO cenarepas;

-- 1. Crédito: uno por pedido
CREATE TABLE IF NOT EXISTS credito (
    id_credito        SERIAL PRIMARY KEY,
    id_pedido         INTEGER       NOT NULL,
    id_cliente        INTEGER       NOT NULL,
    valor_total       NUMERIC(14,2) NOT NULL,
    valor_abonado     NUMERIC(14,2) NOT NULL DEFAULT 0,
    saldo_pendiente   NUMERIC(14,2) NOT NULL,
    estado            VARCHAR(10)   NOT NULL DEFAULT 'Activo',
    fecha_creacion    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_credito_pedido UNIQUE (id_pedido),
    CONSTRAINT fk_credito_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido (id_pedido) ON DELETE RESTRICT,
    CONSTRAINT fk_credito_cliente FOREIGN KEY (id_cliente)
        REFERENCES cliente (id_cliente) ON DELETE RESTRICT,
    CONSTRAINT ck_credito_estado CHECK (estado IN ('Activo', 'Pagado', 'Anulado')),
    CONSTRAINT ck_credito_valores CHECK (valor_total > 0 AND valor_abonado >= 0 AND saldo_pendiente >= 0)
);
CREATE INDEX IF NOT EXISTS idx_credito_cliente ON credito (id_cliente);

-- 2. Abono: vínculo con el crédito, revisión y anulación
-- ck_abono_referencia exigía pedido XOR venta; ahora un abono migrado guarda ambos.
-- ck_abono_estado solo admitía Registrado/Anulado; se reemplaza en el paso 4.
-- ck_abono_valor, ck_abono_saldo y ck_abono_mediopago se conservan.
ALTER TABLE abono DROP CONSTRAINT IF EXISTS ck_abono_referencia;
ALTER TABLE abono DROP CONSTRAINT IF EXISTS ck_abono_estado;

ALTER TABLE abono
  ADD COLUMN IF NOT EXISTS id_credito           INTEGER,
  ADD COLUMN IF NOT EXISTS fecha_registro       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS id_usuario_registra  INTEGER,
  ADD COLUMN IF NOT EXISTS id_usuario_revisa    INTEGER,
  ADD COLUMN IF NOT EXISTS fecha_revision       TIMESTAMP,
  ADD COLUMN IF NOT EXISTS motivo_rechazo       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS motivo_anulacion     VARCHAR(255);

ALTER TABLE abono
  ADD CONSTRAINT fk_abono_credito FOREIGN KEY (id_credito)
    REFERENCES credito (id_credito) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_abono_usuario_registra FOREIGN KEY (id_usuario_registra)
    REFERENCES usuario (id_usuario) ON DELETE SET NULL,
  ADD CONSTRAINT fk_abono_usuario_revisa FOREIGN KEY (id_usuario_revisa)
    REFERENCES usuario (id_usuario) ON DELETE SET NULL;

-- 3. Los abonos que apuntaban a una venta pasan también a su pedido
--    (id_venta se conserva como historial).
UPDATE abono a
SET id_pedido = COALESCE(v.id_pedido, p.id_pedido)
FROM venta v
LEFT JOIN pedido p ON p.id_venta_origen = v.id_venta
WHERE a.id_venta = v.id_venta
  AND a.id_pedido IS NULL;

-- 4. Estados y medio de pago: 'Registrado' (hecho por el personal) → 'Aprobado'
UPDATE abono SET estado = CASE LOWER(TRIM(estado))
    WHEN 'registrado'  THEN 'Aprobado'
    WHEN 'aprobado'    THEN 'Aprobado'
    WHEN 'en revision' THEN 'En revisión'
    WHEN 'en revisión' THEN 'En revisión'
    WHEN 'rechazado'   THEN 'Rechazado'
    WHEN 'anulado'     THEN 'Anulado'
    ELSE estado
  END;
-- Medio de pago con la misma conversión del pedido (script 002).
UPDATE abono SET medio_pago = CASE
    WHEN medio_pago IS NULL OR TRIM(medio_pago) = '' THEN NULL
    WHEN LOWER(TRIM(medio_pago)) IN ('efectivo', 'contado', 'contra entrega', 'efectivo contra entrega')
      THEN 'Efectivo'
    WHEN LOWER(TRIM(medio_pago)) IN ('tarjeta', 'tarjeta credito', 'tarjeta crédito', 'tarjeta debito',
                                     'tarjeta débito', 'datafono', 'datáfono', 'tarjeta (datáfono al recibir)')
      THEN 'Tarjeta'
    WHEN LOWER(TRIM(medio_pago)) IN ('transferencia', 'transferencia bancaria', 'transferencia bancolombia',
                                     'bancolombia', 'nequi', 'daviplata', 'pse')
      THEN 'Transferencia'
    ELSE medio_pago  -- valor desconocido: lo detiene la verificación siguiente
  END;

DO $$
DECLARE desconocidos TEXT;
BEGIN
  SELECT string_agg(DISTINCT medio_pago, ', ') INTO desconocidos
  FROM abono
  WHERE medio_pago IS NOT NULL AND medio_pago NOT IN ('Efectivo', 'Tarjeta', 'Transferencia');
  IF desconocidos IS NOT NULL THEN
    RAISE EXCEPTION 'Medios de pago sin conversión definida en abono: %. Se revierte la migración.', desconocidos;
  END IF;
END $$;
UPDATE abono SET fecha_registro = fecha_abono::timestamp;

ALTER TABLE abono ALTER COLUMN estado SET DEFAULT 'En revisión';
ALTER TABLE abono
  ADD CONSTRAINT ck_abono_estado CHECK (estado IN ('En revisión', 'Aprobado', 'Rechazado', 'Anulado')),
  ADD CONSTRAINT ck_abono_referencia CHECK (id_pedido IS NOT NULL OR id_venta IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_abono_credito ON abono (id_credito);
CREATE INDEX IF NOT EXISTS idx_abono_estado ON abono (estado);

-- 5. Ventas que estaban "Pendiente": su pedido (ya Entregado) recibe un crédito
--    con el saldo = total − abonos aprobados.
INSERT INTO credito (id_pedido, id_cliente, valor_total, valor_abonado, saldo_pendiente, estado, fecha_creacion)
SELECT p.id_pedido, p.id_cliente, p.valor_total,
       LEAST(p.valor_total, COALESCE(ab.total, 0)),
       GREATEST(p.valor_total - COALESCE(ab.total, 0), 0),
       CASE WHEN p.valor_total - COALESCE(ab.total, 0) <= 0 THEN 'Pagado' ELSE 'Activo' END,
       v.fecha_venta
FROM pedido p
JOIN venta v ON v.id_venta = p.id_venta_origen
LEFT JOIN (
  SELECT id_pedido, SUM(valor_abonado) AS total
  FROM abono WHERE estado = 'Aprobado' GROUP BY id_pedido
) ab ON ab.id_pedido = p.id_pedido
WHERE LOWER(v.estado) = 'pendiente'
  AND p.valor_total > 0
ON CONFLICT (id_pedido) DO NOTHING;

UPDATE abono a
SET id_credito = c.id_credito
FROM credito c
WHERE a.id_pedido = c.id_pedido
  AND a.id_credito IS NULL;

COMMIT;
