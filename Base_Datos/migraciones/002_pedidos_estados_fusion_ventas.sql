-- 002 · Pedido único: estados de la matriz y fusión de ventas en pedidos
-- Estados: Pendiente, En proceso, Entregado, Anulado (CA-118-001).
-- Un pedido Entregado es una venta. La tabla venta y detalle_venta NO se
-- borran: quedan como historial y cada pedido guarda id_venta_origen.
-- Aplica SOLO en cenarepas_staging.
BEGIN;

DO $$
BEGIN
  IF current_database() <> 'cenarepas_staging' THEN
    RAISE EXCEPTION 'Migración bloqueada: solo se aplica en cenarepas_staging (base actual: %)', current_database();
  END IF;
END $$;

SET search_path TO cenarepas;

-- 1. Columnas nuevas del pedido (entrega, pago y trazabilidad)
ALTER TABLE pedido
  ADD COLUMN IF NOT EXISTS medio_pago            VARCHAR(20),
  ADD COLUMN IF NOT EXISTS comprobante_url       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS direccion_entrega     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS municipio_entrega     VARCHAR(60),
  ADD COLUMN IF NOT EXISTS barrio_entrega        VARCHAR(80),
  ADD COLUMN IF NOT EXISTS complemento_entrega   VARCHAR(120),
  ADD COLUMN IF NOT EXISTS indicaciones_entrega  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS origen                VARCHAR(10) NOT NULL DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS fecha_entregado       TIMESTAMP,
  ADD COLUMN IF NOT EXISTS fecha_anulacion       TIMESTAMP,
  ADD COLUMN IF NOT EXISTS stock_descontado      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS id_venta_origen       INTEGER;

ALTER TABLE pedido
  ADD CONSTRAINT fk_pedido_venta_origen FOREIGN KEY (id_venta_origen)
    REFERENCES venta (id_venta) ON DELETE SET NULL;

-- 2. Estados actuales del pedido → estados de la matriz
--    (ck_pedido_estado actual admite los estados viejos; se reemplaza en el paso 5)
ALTER TABLE pedido DROP CONSTRAINT IF EXISTS ck_pedido_estado;

UPDATE pedido SET estado = CASE LOWER(TRIM(estado))
    WHEN 'pendiente'           THEN 'Pendiente'
    WHEN 'en preparacion'      THEN 'En proceso'
    WHEN 'en preparación'      THEN 'En proceso'
    WHEN 'listo para entregar' THEN 'En proceso'
    WHEN 'en proceso'          THEN 'En proceso'
    WHEN 'entregado'           THEN 'Entregado'
    WHEN 'anulado'             THEN 'Anulado'
    WHEN 'cancelado'           THEN 'Anulado'
    ELSE estado
  END;

-- 3. Ventas ligadas a un pedido: el pedido toma el estado y el pago de la venta
--    Pagada / Pendiente / Completada → Entregado; Anulada → Anulado.
--    (Si un pedido tuviera varias ventas, manda la más reciente.)
UPDATE pedido p
SET estado          = CASE WHEN LOWER(v.estado) IN ('anulada', 'anulado') THEN 'Anulado' ELSE 'Entregado' END,
    medio_pago      = COALESCE(p.medio_pago, v.medio_pago),
    comprobante_url = COALESCE(p.comprobante_url, v.comprobante_url),
    fecha_entregado = CASE WHEN LOWER(v.estado) IN ('anulada', 'anulado') THEN p.fecha_entregado ELSE v.fecha_venta END,
    fecha_anulacion = CASE WHEN LOWER(v.estado) IN ('anulada', 'anulado') THEN v.fecha_venta ELSE p.fecha_anulacion END,
    id_venta_origen = v.id_venta
FROM (
  SELECT DISTINCT ON (id_pedido) *
  FROM venta
  WHERE id_pedido IS NOT NULL
  ORDER BY id_pedido, fecha_venta DESC, id_venta DESC
) v
WHERE v.id_pedido = p.id_pedido;

-- 4. Ventas directas (sin pedido): se crea su pedido con el mismo detalle.
--    Hoy no hay ninguna en la base; se deja para que la migración sea completa.
INSERT INTO pedido (id_cliente, id_sede, id_usuario, fecha_pedido, fecha_entrega, valor_total,
                    estado, medio_pago, comprobante_url, fecha_entregado, fecha_anulacion, id_venta_origen,
                    observaciones)
SELECT v.id_cliente, v.id_sede, v.id_usuario, v.fecha_venta, v.fecha_venta::date, v.valor_total,
       CASE WHEN LOWER(v.estado) IN ('anulada', 'anulado') THEN 'Anulado' ELSE 'Entregado' END,
       v.medio_pago, v.comprobante_url,
       CASE WHEN LOWER(v.estado) IN ('anulada', 'anulado') THEN NULL ELSE v.fecha_venta END,
       CASE WHEN LOWER(v.estado) IN ('anulada', 'anulado') THEN v.fecha_venta ELSE NULL END,
       v.id_venta, 'Migrado desde la venta #' || v.id_venta
FROM venta v
WHERE v.id_pedido IS NULL
  AND NOT EXISTS (SELECT 1 FROM pedido p WHERE p.id_venta_origen = v.id_venta);

INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
SELECT p.id_pedido, dv.id_producto, dv.cantidad, dv.precio_unitario, dv.subtotal
FROM venta v
JOIN pedido p ON p.id_venta_origen = v.id_venta
JOIN detalle_venta dv ON dv.id_venta = v.id_venta
WHERE v.id_pedido IS NULL
  AND NOT EXISTS (SELECT 1 FROM detalle_pedido dp WHERE dp.id_pedido = p.id_pedido);

-- 5. Medio de pago: solo Efectivo, Tarjeta o Transferencia.
--    Variantes en minúscula y billeteras (Nequi, Daviplata, Bancolombia, PSE) → Transferencia;
--    datáfono / tarjeta crédito o débito → Tarjeta; contado / contra entrega → Efectivo.
--    Cualquier otro valor (p. ej. 'Credito', que admitía la venta) detiene la migración.
UPDATE pedido SET medio_pago = CASE
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
  FROM pedido
  WHERE medio_pago IS NOT NULL AND medio_pago NOT IN ('Efectivo', 'Tarjeta', 'Transferencia');
  IF desconocidos IS NOT NULL THEN
    RAISE EXCEPTION 'Medios de pago sin conversión definida en pedido: %. Se revierte la migración.', desconocidos;
  END IF;
END $$;

ALTER TABLE pedido ALTER COLUMN estado SET DEFAULT 'Pendiente';
ALTER TABLE pedido
  ADD CONSTRAINT ck_pedido_estado
    CHECK (estado IN ('Pendiente', 'En proceso', 'Entregado', 'Anulado')),
  ADD CONSTRAINT ck_pedido_mediopago
    CHECK (medio_pago IS NULL OR medio_pago IN ('Efectivo', 'Tarjeta', 'Transferencia')),
  ADD CONSTRAINT ck_pedido_origen
    CHECK (origen IN ('personal', 'app'));

CREATE INDEX IF NOT EXISTS idx_pedido_estado ON pedido (estado);

COMMIT;
