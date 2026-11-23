-- 005 · Notificaciones del cliente (HU-168, HU-169)
-- Aplica SOLO en cenarepas_staging.
BEGIN;

DO $$
BEGIN
  IF current_database() <> 'cenarepas_staging' THEN
    RAISE EXCEPTION 'Migración bloqueada: solo se aplica en cenarepas_staging (base actual: %)', current_database();
  END IF;
END $$;

SET search_path TO cenarepas;

CREATE TABLE IF NOT EXISTS notificacion (
    id_notificacion   SERIAL PRIMARY KEY,
    id_usuario        INTEGER      NOT NULL,
    id_pedido         INTEGER,
    id_abono          INTEGER,
    tipo              VARCHAR(30)  NOT NULL,
    titulo            VARCHAR(120) NOT NULL,
    mensaje           VARCHAR(500) NOT NULL,
    leida             BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_creacion    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura     TIMESTAMP,
    CONSTRAINT fk_notificacion_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_notificacion_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido (id_pedido) ON DELETE SET NULL,
    CONSTRAINT fk_notificacion_abono FOREIGN KEY (id_abono)
        REFERENCES abono (id_abono) ON DELETE SET NULL,
    CONSTRAINT ck_notificacion_tipo CHECK (tipo IN
        ('pedido_creado', 'pedido_estado', 'abono_aprobado', 'abono_rechazado'))
);

CREATE INDEX IF NOT EXISTS idx_notificacion_usuario ON notificacion (id_usuario, leida, fecha_creacion DESC);

COMMIT;
