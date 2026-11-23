
-- Script DDL para la base de datos cenarepas_db
-- Esquema: cenarepas

CREATE SCHEMA IF NOT EXISTS cenarepas;
SET search_path TO cenarepas;

CREATE TABLE IF NOT EXISTS rol (
    id_rol            SERIAL PRIMARY KEY,
    nombre            VARCHAR(50)  NOT NULL UNIQUE,
    descripcion       VARCHAR(255),
    estado            VARCHAR(10)  NOT NULL DEFAULT 'activo',
    fecha_creacion    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permiso (
    id_permiso        SERIAL PRIMARY KEY,
    modulo            VARCHAR(50)  NOT NULL,
    accion            VARCHAR(50)  NOT NULL,
    estado            VARCHAR(10)  NOT NULL DEFAULT 'activo',
    CONSTRAINT uq_permiso_modulo_accion UNIQUE (modulo, accion)
);

CREATE TABLE IF NOT EXISTS rol_permiso (
    id_rol            INTEGER NOT NULL,
    id_permiso        INTEGER NOT NULL,
    CONSTRAINT pk_rol_permiso PRIMARY KEY (id_rol, id_permiso),
    CONSTRAINT fk_rolpermiso_rol FOREIGN KEY (id_rol)
        REFERENCES rol (id_rol) ON DELETE CASCADE,
    CONSTRAINT fk_rolpermiso_permiso FOREIGN KEY (id_permiso)
        REFERENCES permiso (id_permiso) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS usuario (
    id_usuario            SERIAL PRIMARY KEY,
    nombre                VARCHAR(100) NOT NULL,
    correo                VARCHAR(100) NOT NULL UNIQUE,
    contrasena_hash       VARCHAR(255) NOT NULL,
    id_rol                INTEGER      NOT NULL,
    estado                VARCHAR(10)  NOT NULL DEFAULT 'activo',
    token_recuperacion    VARCHAR(255),
    token_expiracion      TIMESTAMP,
    fecha_creacion        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol)
        REFERENCES rol (id_rol) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS proveedor (
    id_proveedor      SERIAL PRIMARY KEY,
    nombre            VARCHAR(150) NOT NULL,
    nit               VARCHAR(20)  NOT NULL UNIQUE,
    telefono          VARCHAR(20),
    correo            VARCHAR(150) UNIQUE,
    direccion         VARCHAR(255),
    estado            VARCHAR(10)  NOT NULL DEFAULT 'activo',
    fecha_creacion    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categoria_producto (
    id_categoria      SERIAL PRIMARY KEY,
    nombre            VARCHAR(80)  NOT NULL UNIQUE,
    descripcion       VARCHAR(255),
    estado            VARCHAR(10)  NOT NULL DEFAULT 'activo'
);

CREATE TABLE IF NOT EXISTS ficha_tecnica (
    id_ficha                    SERIAL PRIMARY KEY,
    nombre                      VARCHAR(100) NOT NULL,
    descripcion                 VARCHAR(255),
    instrucciones_preparacion   TEXT,
    tiempo_estimado_minutos     INTEGER,
    rendimiento_lote            NUMERIC(12,2),
    estado                      VARCHAR(10)  NOT NULL DEFAULT 'activo'
);

CREATE TABLE IF NOT EXISTS producto (
    id_producto       SERIAL PRIMARY KEY,
    nombre            VARCHAR(100) NOT NULL,
    descripcion       VARCHAR(255),
    id_categoria      INTEGER      NOT NULL,
    id_ficha          INTEGER,
    id_proveedor      INTEGER,
    precio_venta      NUMERIC(12,2) NOT NULL,
    imagen_url        VARCHAR(255),
    stock_actual      NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock_minimo      NUMERIC(12,2) NOT NULL DEFAULT 0,
    fecha_vencimiento DATE,
    estado            VARCHAR(10)  NOT NULL DEFAULT 'activo',
    CONSTRAINT fk_producto_categoria FOREIGN KEY (id_categoria)
        REFERENCES categoria_producto (id_categoria) ON DELETE RESTRICT,
    CONSTRAINT fk_producto_ficha FOREIGN KEY (id_ficha)
        REFERENCES ficha_tecnica (id_ficha) ON DELETE SET NULL,
    CONSTRAINT fk_producto_proveedor FOREIGN KEY (id_proveedor)
        REFERENCES proveedor (id_proveedor) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS insumo (
    id_insumo         SERIAL PRIMARY KEY,
    nombre            VARCHAR(100) NOT NULL,
    unidad_medida     VARCHAR(20)  NOT NULL,
    stock_actual      NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock_minimo      NUMERIC(12,2) NOT NULL DEFAULT 0,
    fecha_vencimiento DATE,
    id_proveedor      INTEGER,
    estado            VARCHAR(10)  NOT NULL DEFAULT 'activo',
    CONSTRAINT fk_insumo_proveedor FOREIGN KEY (id_proveedor)
        REFERENCES proveedor (id_proveedor) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ficha_tecnica_insumo (
    id_ficha_insumo   SERIAL PRIMARY KEY,
    id_ficha          INTEGER NOT NULL,
    id_insumo         INTEGER NOT NULL,
    cantidad          NUMERIC(12,2) NOT NULL,
    unidad_medida     VARCHAR(20)  NOT NULL,
    CONSTRAINT fk_fti_ficha FOREIGN KEY (id_ficha)
        REFERENCES ficha_tecnica (id_ficha) ON DELETE CASCADE,
    CONSTRAINT fk_fti_insumo FOREIGN KEY (id_insumo)
        REFERENCES insumo (id_insumo) ON DELETE RESTRICT,
    CONSTRAINT uq_fti_ficha_insumo UNIQUE (id_ficha, id_insumo)
);

CREATE TABLE IF NOT EXISTS compra (
    id_compra         SERIAL PRIMARY KEY,
    id_proveedor      INTEGER NOT NULL,
    id_usuario        INTEGER NOT NULL,
    fecha_compra      DATE    NOT NULL DEFAULT CURRENT_DATE,
    valor_total       NUMERIC(14,2) NOT NULL DEFAULT 0,
    medio_pago        VARCHAR(20),
    comprobante_url   VARCHAR(255),
    estado            VARCHAR(15)  NOT NULL DEFAULT 'activo',
    fecha_registro    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_compra_proveedor FOREIGN KEY (id_proveedor)
        REFERENCES proveedor (id_proveedor) ON DELETE RESTRICT,
    CONSTRAINT fk_compra_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS detalle_compra (
    id_detalle_compra SERIAL PRIMARY KEY,
    id_compra         INTEGER NOT NULL,
    id_insumo         INTEGER NOT NULL,
    cantidad          NUMERIC(12,2) NOT NULL,
    valor_unitario    NUMERIC(12,2) NOT NULL,
    subtotal          NUMERIC(14,2) NOT NULL,
    CONSTRAINT fk_detcompra_compra FOREIGN KEY (id_compra)
        REFERENCES compra (id_compra) ON DELETE CASCADE,
    CONSTRAINT fk_detcompra_insumo FOREIGN KEY (id_insumo)
        REFERENCES insumo (id_insumo) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS lote_produccion (
    id_lote                   SERIAL PRIMARY KEY,
    id_ficha                  INTEGER NOT NULL,
    id_usuario_responsable    INTEGER NOT NULL,
    fecha_produccion          DATE    NOT NULL DEFAULT CURRENT_DATE,
    cantidad_producida        NUMERIC(12,2) NOT NULL,
    estado                    VARCHAR(15)  NOT NULL DEFAULT 'en_proceso',
    observaciones             VARCHAR(255),
    inventario_aplicado       BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_lote_ficha FOREIGN KEY (id_ficha)
        REFERENCES ficha_tecnica (id_ficha) ON DELETE RESTRICT,
    CONSTRAINT fk_lote_usuario FOREIGN KEY (id_usuario_responsable)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT
);

ALTER TABLE lote_produccion
    ADD COLUMN IF NOT EXISTS inventario_aplicado BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS lote_produccion_insumo (
    id_lote_insumo        SERIAL PRIMARY KEY,
    id_lote               INTEGER NOT NULL,
    id_insumo             INTEGER NOT NULL,
    cantidad_consumida    NUMERIC(12,2) NOT NULL,
    CONSTRAINT fk_lpi_lote FOREIGN KEY (id_lote)
        REFERENCES lote_produccion (id_lote) ON DELETE CASCADE,
    CONSTRAINT fk_lpi_insumo FOREIGN KEY (id_insumo)
        REFERENCES insumo (id_insumo) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS cliente (
    id_cliente        SERIAL PRIMARY KEY,
    nombre            VARCHAR(150) NOT NULL,
    documento         VARCHAR(20)  NOT NULL UNIQUE,
    telefono          VARCHAR(20),
    correo            VARCHAR(150),
    direccion         VARCHAR(255),
    estado            VARCHAR(10)  NOT NULL DEFAULT 'activo',
    fecha_creacion    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sede (
    id_sede               SERIAL PRIMARY KEY,
    nombre                VARCHAR(80)  NOT NULL,
    direccion             VARCHAR(255) NOT NULL,
    telefono              VARCHAR(20),
    horario_atencion      VARCHAR(100),
    responsable           VARCHAR(100),
    estado                VARCHAR(10)  NOT NULL DEFAULT 'activo'
);

CREATE TABLE IF NOT EXISTS pedido (
    id_pedido             SERIAL PRIMARY KEY,
    id_cliente            INTEGER NOT NULL,
    id_sede               INTEGER NOT NULL,
    id_usuario            INTEGER NOT NULL,
    fecha_pedido          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega         DATE,
    valor_total           NUMERIC(14,2) NOT NULL DEFAULT 0,
    estado                VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    observaciones         VARCHAR(255),
    motivo_anulacion      VARCHAR(255),
    CONSTRAINT fk_pedido_cliente FOREIGN KEY (id_cliente)
        REFERENCES cliente (id_cliente) ON DELETE RESTRICT,
    CONSTRAINT fk_pedido_sede FOREIGN KEY (id_sede)
        REFERENCES sede (id_sede) ON DELETE RESTRICT,
    CONSTRAINT fk_pedido_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS detalle_pedido (
    id_detalle_pedido     SERIAL PRIMARY KEY,
    id_pedido             INTEGER NOT NULL,
    id_producto           INTEGER NOT NULL,
    cantidad              NUMERIC(12,2) NOT NULL,
    precio_unitario       NUMERIC(12,2) NOT NULL,
    subtotal              NUMERIC(14,2) NOT NULL,
    CONSTRAINT fk_detpedido_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido (id_pedido) ON DELETE CASCADE,
    CONSTRAINT fk_detpedido_producto FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS venta (
    id_venta          SERIAL PRIMARY KEY,
    id_sede           INTEGER NOT NULL,
    id_cliente        INTEGER NOT NULL,
    id_usuario        INTEGER NOT NULL,
    id_pedido         INTEGER,
    fecha_venta       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valor_total       NUMERIC(14,2) NOT NULL DEFAULT 0,
    medio_pago        VARCHAR(20),
    comprobante_url   VARCHAR(255),
    estado            VARCHAR(15) NOT NULL DEFAULT 'completada',
    CONSTRAINT fk_venta_sede FOREIGN KEY (id_sede)
        REFERENCES sede (id_sede) ON DELETE RESTRICT,
    CONSTRAINT fk_venta_cliente FOREIGN KEY (id_cliente)
        REFERENCES cliente (id_cliente) ON DELETE RESTRICT,
    CONSTRAINT fk_venta_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
    CONSTRAINT fk_venta_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido (id_pedido) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS detalle_venta (
    id_detalle_venta      SERIAL PRIMARY KEY,
    id_venta              INTEGER NOT NULL,
    id_producto           INTEGER NOT NULL,
    cantidad              NUMERIC(12,2) NOT NULL,
    precio_unitario       NUMERIC(12,2) NOT NULL,
    subtotal              NUMERIC(14,2) NOT NULL,
    CONSTRAINT fk_detventa_venta FOREIGN KEY (id_venta)
        REFERENCES venta (id_venta) ON DELETE CASCADE,
    CONSTRAINT fk_detventa_producto FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS abono (
    id_abono              SERIAL PRIMARY KEY,
    id_cliente            INTEGER NOT NULL,
    id_pedido             INTEGER,
    id_venta              INTEGER,
    fecha_abono           DATE NOT NULL DEFAULT CURRENT_DATE,
    valor_abonado         NUMERIC(12,2) NOT NULL,
    saldo_pendiente       NUMERIC(12,2) NOT NULL DEFAULT 0,
    medio_pago            VARCHAR(20),
    comprobante_url       VARCHAR(255),
    estado                VARCHAR(15) NOT NULL DEFAULT 'registrado',
    CONSTRAINT fk_abono_cliente FOREIGN KEY (id_cliente)
        REFERENCES cliente (id_cliente) ON DELETE RESTRICT,
    CONSTRAINT fk_abono_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido (id_pedido) ON DELETE SET NULL,
    CONSTRAINT fk_abono_venta FOREIGN KEY (id_venta)
        REFERENCES venta (id_venta) ON DELETE SET NULL,
    CONSTRAINT chk_abono_referencia CHECK (
        (id_pedido IS NOT NULL AND id_venta IS NULL) OR
        (id_pedido IS NULL AND id_venta IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS auditoria (
    id_auditoria          SERIAL PRIMARY KEY,
    id_usuario            INTEGER,
    tabla_afectada        VARCHAR(50) NOT NULL,
    id_registro_afectado  INTEGER,
    accion                VARCHAR(20) NOT NULL,
    detalle               TEXT,
    fecha_evento          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE SET NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_producto_categoria ON producto (id_categoria);
CREATE INDEX IF NOT EXISTS idx_producto_ficha ON producto (id_ficha);
CREATE INDEX IF NOT EXISTS idx_insumo_proveedor ON insumo (id_proveedor);
CREATE INDEX IF NOT EXISTS idx_pedido_cliente ON pedido (id_cliente);
CREATE INDEX IF NOT EXISTS idx_venta_cliente ON venta (id_cliente);
CREATE INDEX IF NOT EXISTS idx_venta_pedido ON venta (id_pedido);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_venta ON detalle_venta (id_venta);
CREATE INDEX IF NOT EXISTS idx_detalle_pedido_pedido ON detalle_pedido (id_pedido);
CREATE INDEX IF NOT EXISTS idx_lote_produccion_ficha ON lote_produccion (id_ficha);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria (id_usuario);
Mostrando script_cenarepas.sql.