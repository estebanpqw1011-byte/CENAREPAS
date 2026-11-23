-- 010 · Historial de estados del pedido (d; HU-109, HU-118, CA-111-002).
-- Cada cambio de estado queda registrado: estado anterior y nuevo, quién,
-- cuándo y el motivo (anulaciones). El backend escribe una fila al crear el
-- pedido (Pendiente) y en cada cambio (PedidosService.#aplicarEstado).
--
-- Reconstrucción de los pedidos que ya existen (reconstruido = TRUE): solo
-- los hechos que la base conoce con fecha:
--   - creación → Pendiente, en fecha_pedido, por pedido.id_usuario;
--   - En proceso → Entregado, en fecha_entregado (Entregado solo llega desde
--     En proceso; la fecha de "En proceso" no se guardaba y no se inventa);
--   - → Anulado, en fecha_anulacion, con motivo_anulacion (el estado
--     anterior no se conoce: queda NULL).
-- Idempotente (solo reconstruye pedidos sin historial). Aplica SOLO en
-- cenarepas_staging.
BEGIN;

DO $$
BEGIN
  IF current_database() <> 'cenarepas_staging' THEN
    RAISE EXCEPTION 'Migración bloqueada: solo se aplica en cenarepas_staging (base actual: %)', current_database();
  END IF;
END $$;

SET search_path TO cenarepas;

CREATE TABLE IF NOT EXISTS pedido_estado_historial (
  id_historial    SERIAL PRIMARY KEY,
  id_pedido       INTEGER NOT NULL REFERENCES pedido (id_pedido),
  estado_anterior VARCHAR(20),
  estado_nuevo    VARCHAR(20) NOT NULL,
  id_usuario      INTEGER REFERENCES usuario (id_usuario),
  motivo          VARCHAR(255),
  fecha_cambio    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reconstruido    BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT ck_historial_estado_nuevo
    CHECK (estado_nuevo IN ('Pendiente', 'En proceso', 'Entregado', 'Anulado')),
  CONSTRAINT ck_historial_estado_anterior
    CHECK (estado_anterior IS NULL OR estado_anterior IN ('Pendiente', 'En proceso', 'Entregado', 'Anulado'))
);

CREATE INDEX IF NOT EXISTS ix_historial_pedido_fecha
  ON pedido_estado_historial (id_pedido, fecha_cambio);

-- Reconstrucción (solo pedidos que aún no tienen historial).
CREATE TEMP TABLE sin_historial ON COMMIT DROP AS
SELECT p.* FROM pedido p
WHERE NOT EXISTS (SELECT 1 FROM pedido_estado_historial h WHERE h.id_pedido = p.id_pedido);

INSERT INTO pedido_estado_historial (id_pedido, estado_anterior, estado_nuevo, id_usuario, motivo, fecha_cambio, reconstruido)
SELECT id_pedido, NULL, 'Pendiente', id_usuario, NULL, fecha_pedido, TRUE
FROM sin_historial;

INSERT INTO pedido_estado_historial (id_pedido, estado_anterior, estado_nuevo, id_usuario, motivo, fecha_cambio, reconstruido)
SELECT id_pedido, 'En proceso', 'Entregado', NULL, NULL, fecha_entregado, TRUE
FROM sin_historial
WHERE fecha_entregado IS NOT NULL;

INSERT INTO pedido_estado_historial (id_pedido, estado_anterior, estado_nuevo, id_usuario, motivo, fecha_cambio, reconstruido)
SELECT id_pedido, NULL, 'Anulado', NULL, motivo_anulacion, fecha_anulacion, TRUE
FROM sin_historial
WHERE fecha_anulacion IS NOT NULL;

-- Todo pedido debe tener al menos su fila de creación.
DO $$
DECLARE
  faltan INT;
BEGIN
  SELECT count(*) INTO faltan FROM pedido p
  WHERE NOT EXISTS (SELECT 1 FROM pedido_estado_historial h WHERE h.id_pedido = p.id_pedido);
  IF faltan > 0 THEN
    RAISE EXCEPTION '% pedidos quedaron sin historial', faltan;
  END IF;
END $$;

COMMIT;
