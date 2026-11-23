-- ============================================================================
-- CENAREPAS - Script Consolidado de Base de Datos
-- Versión: 2.1 (Consolidación cenarepas_db + Migraciones 001 a 012)
-- Esquema: cenarepas
-- Motor: PostgreSQL 14+ (probado en PostgreSQL 18)
--
-- Contenido:
-- 1. Extensión pg_trgm (búsquedas trigram) y creación del esquema cenarepas.
-- 2. DDL de las 25 tablas del sistema en orden de dependencias.
-- 3. Claves primarias, foráneas, restricciones UNIQUE y CHECK.
-- 4. Índices (B-Tree, GIN trigram, únicos funcionales).
-- 5. Comentarios de documentación técnica y casos de uso por tabla.
-- 6. Datos base del sistema: roles, permisos (16 módulos x 7 acciones)
--    y matriz rol_permiso (Admin 112, Secretaria 78, Vendedor 22).
--
-- NOTA: Este script NO contiene datos de prueba ni datos semilla de demostración.
--       Los datos de demostración están en cenarepas_datos_demo.sql.
--
-- USO (base nueva y vacía):
--   createdb -U postgres -E UTF8 <base>
--   psql -U postgres -d <base> -v ON_ERROR_STOP=1 -f Base_Datos/cenarepas_completo.sql
--
-- PROTECCIÓN: todo corre en una sola transacción y se niega a ejecutarse si el
-- esquema cenarepas ya tiene tablas (Staging, cenarepas_db o cualquier base en
-- uso): en ese caso no cambia nada. Las bases existentes se actualizan con las
-- migraciones de Base_Datos/migraciones/, no con este script.
--
-- FUENTE: es el resultado de cenarepas_db + migraciones 001 a 012. Se verifica
-- con pg_dump --schema-only frente a cenarepas_staging (sin diferencias) y con
-- Base_Datos/herramientas/comparar_esquemas.js.
-- ============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'cenarepas') THEN
    RAISE EXCEPTION 'La base "%" ya tiene tablas en el esquema cenarepas: este script solo crea bases nuevas. No se cambió nada.', current_database();
  END IF;
END
$$;

-- 1. EXTENSIÓN Y ESQUEMA
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

CREATE SCHEMA IF NOT EXISTS cenarepas;
SET search_path TO cenarepas, public;

-- ============================================================================
-- 2. TABLAS Y ESTRUCTURAS BASE
-- ============================================================================
-- Los CHECK de listas de las tablas originales se escriben como
-- "col::text = ANY (ARRAY['a'::varchar::text, ...])" y no como "col IN (...)":
-- es la forma en que quedaron en cenarepas_db y Staging. Significan lo mismo;
-- escritos así, pg_dump de una base nueva y de Staging es idéntico.

-- ----------------------------------------------------------------------------
-- Tabla: rol (HU-005 a HU-012)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rol (
    id_rol            SERIAL PRIMARY KEY,
    nombre            VARCHAR(50)  NOT NULL,
    descripcion       VARCHAR(255),
    estado            VARCHAR(10)  NOT NULL DEFAULT 'Activo',
    fecha_creacion    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_rol_nombre UNIQUE (nombre),
    CONSTRAINT ck_rol_estado CHECK (estado::text = ANY (ARRAY['Activo'::varchar::text, 'Inactivo'::varchar::text]))
);
COMMENT ON TABLE rol IS 'HU-005 a HU-012: perfiles de usuario (Administrador, Secretaria, Vendedor, etc.)';

-- ----------------------------------------------------------------------------
-- Tabla: permiso (CA-012)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permiso (
    id_permiso        SERIAL PRIMARY KEY,
    modulo            VARCHAR(50)  NOT NULL,
    accion            VARCHAR(50)  NOT NULL,
    estado            VARCHAR(10)  NOT NULL DEFAULT 'Activo',
    CONSTRAINT uq_permiso_modulo_accion UNIQUE (modulo, accion),
    CONSTRAINT ck_permiso_estado CHECK (estado::text = ANY (ARRAY['Activo'::varchar::text, 'Inactivo'::varchar::text]))
);
COMMENT ON TABLE permiso IS 'CA-012: acciones disponibles por módulo, asignables a roles';

-- ----------------------------------------------------------------------------
-- Tabla: rol_permiso (HU-012)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rol_permiso (
    id_rol            INTEGER NOT NULL,
    id_permiso        INTEGER NOT NULL,
    CONSTRAINT rol_permiso_pkey PRIMARY KEY (id_rol, id_permiso),
    CONSTRAINT fk_rolpermiso_rol FOREIGN KEY (id_rol)
        REFERENCES rol (id_rol) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_rolpermiso_permiso FOREIGN KEY (id_permiso)
        REFERENCES permiso (id_permiso) ON UPDATE CASCADE ON DELETE CASCADE
);
COMMENT ON TABLE rol_permiso IS 'Relación N:M entre rol y permiso (HU-012)';

-- ----------------------------------------------------------------------------
-- Tabla: usuario (HU-013 a HU-024)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario            SERIAL PRIMARY KEY,
    nombre                VARCHAR(100) NOT NULL,
    correo                VARCHAR(150) NOT NULL,
    contrasena_hash       VARCHAR(255) NOT NULL,
    id_rol                INTEGER      NOT NULL,
    estado                VARCHAR(10)  NOT NULL DEFAULT 'Activo',
    token_recuperacion    VARCHAR(255),
    token_expiracion      TIMESTAMP,
    fecha_creacion        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recuperacion_intentos INTEGER      NOT NULL DEFAULT 0,
    tipo_documento        VARCHAR(5),
    documento             VARCHAR(20),
    CONSTRAINT uq_usuario_correo UNIQUE (correo),
    CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol)
        REFERENCES rol (id_rol) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_usuario_estado CHECK (estado::text = ANY (ARRAY['Activo'::varchar::text, 'Inactivo'::varchar::text])),
    CONSTRAINT ck_usuario_recuperacion_intentos CHECK (recuperacion_intentos >= 0),
    CONSTRAINT ck_usuario_tipodocumento CHECK (tipo_documento IS NULL OR tipo_documento IN ('CC', 'CE', 'NIT', 'PP', 'TI')),
    CONSTRAINT ck_usuario_documento_completo CHECK ((tipo_documento IS NULL) = (documento IS NULL))
);
COMMENT ON TABLE usuario IS 'HU-013 a HU-024: cuentas de acceso al sistema (Administrador/Secretaria/Vendedor)';
COMMENT ON COLUMN usuario.token_recuperacion IS 'CA-003/CA-024: token temporal para recuperación de contraseña';

-- ----------------------------------------------------------------------------
-- Tabla: sede (Acta - Subproceso de Sedes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sede (
    id_sede           SERIAL PRIMARY KEY,
    nombre            VARCHAR(80)  NOT NULL,
    direccion         VARCHAR(255) NOT NULL,
    telefono          VARCHAR(20),
    horario_atencion  VARCHAR(100),
    responsable       VARCHAR(100),
    estado                VARCHAR(10)  NOT NULL DEFAULT 'Activo',
    CONSTRAINT uq_sede_nombre UNIQUE (nombre),
    CONSTRAINT ck_sede_estado CHECK (estado::text = ANY (ARRAY['Activo'::varchar::text, 'Inactivo'::varchar::text]))
);
COMMENT ON TABLE sede IS 'Acta - Subproceso de Sedes: Bello Oriente (producción) y Aranjuez (ventas)';

-- ----------------------------------------------------------------------------
-- Tabla: proveedor (HU-025 a HU-033)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proveedor (
    id_proveedor      SERIAL PRIMARY KEY,
    nombre            VARCHAR(150) NOT NULL,
    nit               VARCHAR(20)  NOT NULL,
    telefono          VARCHAR(20),
    correo            VARCHAR(150),
    direccion         VARCHAR(255),
    estado            VARCHAR(10)  NOT NULL DEFAULT 'Activo',
    fecha_creacion    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tipo_documento   VARCHAR(5)   NOT NULL DEFAULT 'NIT',
    tipo_persona     VARCHAR(10)  NOT NULL DEFAULT 'Jurídica',
    nombres          VARCHAR(75),
    apellidos        VARCHAR(74),
    razon_social     VARCHAR(150),
    CONSTRAINT uq_proveedor_nit UNIQUE (nit),
    CONSTRAINT ck_proveedor_estado CHECK (estado::text = ANY (ARRAY['Activo'::varchar::text, 'Inactivo'::varchar::text])),
    CONSTRAINT ck_proveedor_tipodocumento CHECK (tipo_documento IN ('CC', 'CE', 'NIT', 'PP', 'TI')),
    CONSTRAINT ck_proveedor_tipopersona CHECK (tipo_persona IN ('Natural', 'Jurídica'))
);
COMMENT ON COLUMN proveedor.nit IS 'Número de documento del proveedor (su tipo está en tipo_documento)';
COMMENT ON TABLE proveedor IS 'HU-025 a HU-033: solo se inactiva, no se elimina si tiene compras asociadas (CA-030-002)';

-- ----------------------------------------------------------------------------
-- Tabla: insumo (HU-067 a HU-077)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS insumo (
    id_insumo         SERIAL PRIMARY KEY,
    nombre            VARCHAR(100)  NOT NULL,
    unidad_medida     VARCHAR(20)   NOT NULL,
    stock_actual      NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock_minimo      NUMERIC(12,2) NOT NULL DEFAULT 0,
    fecha_vencimiento DATE,
    id_proveedor      INTEGER,
    estado            VARCHAR(10)   NOT NULL DEFAULT 'Activo',
    CONSTRAINT uq_insumo_nombre UNIQUE (nombre),
    CONSTRAINT fk_insumo_proveedor FOREIGN KEY (id_proveedor)
        REFERENCES proveedor (id_proveedor) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT ck_insumo_stock CHECK (stock_actual >= 0),
    CONSTRAINT ck_insumo_stock_min CHECK (stock_minimo >= 0),
    CONSTRAINT ck_insumo_estado CHECK (estado::text = ANY (ARRAY['Activo'::varchar::text, 'Inactivo'::varchar::text]))
);
COMMENT ON TABLE insumo IS 'HU-067 a HU-077: harina de maíz, sal, agua, etc. CA-070-001: incluye proveedor y vencimiento';

-- ----------------------------------------------------------------------------
-- Tabla: categoria_producto (HU-045 a HU-054)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categoria_producto (
    id_categoria      SERIAL PRIMARY KEY,
    nombre            VARCHAR(80)  NOT NULL,
    descripcion       VARCHAR(255),
    estado            VARCHAR(10)  NOT NULL DEFAULT 'Activo',
    imagen_url        VARCHAR(255),
    imagen_public_id VARCHAR(255),
    CONSTRAINT uq_categoria_nombre UNIQUE (nombre),
    CONSTRAINT ck_categoria_estado CHECK (estado::text = ANY (ARRAY['Activo'::varchar::text, 'Inactivo'::varchar::text]))
);
COMMENT ON TABLE categoria_producto IS 'HU-045 a HU-054: clasificación de las arepas (amarilla, blanca, chócolo)';

-- ----------------------------------------------------------------------------
-- Tabla: ficha_tecnica (HU-055 a HU-066)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ficha_tecnica (
    id_ficha                   SERIAL PRIMARY KEY,
    nombre                     VARCHAR(100)  NOT NULL,
    descripcion                VARCHAR(255),
    instrucciones_preparacion  TEXT,
    tiempo_estimado_minutos    INTEGER,
    rendimiento_lote           NUMERIC(12,2),
    estado                     VARCHAR(10)   NOT NULL DEFAULT 'Activo',
    CONSTRAINT uq_ficha_nombre UNIQUE (nombre),
    CONSTRAINT ck_ficha_tiempo CHECK (tiempo_estimado_minutos > 0),
    CONSTRAINT ck_ficha_rendimiento CHECK (rendimiento_lote > 0),
    CONSTRAINT ck_ficha_estado CHECK (estado::text = ANY (ARRAY['Activo'::varchar::text, 'Inactivo'::varchar::text]))
);
COMMENT ON TABLE ficha_tecnica IS 'HU-055 a HU-066: receta de cada producto (arepa) y su composición';

-- ----------------------------------------------------------------------------
-- Tabla: ficha_tecnica_insumo (HU-061/062)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ficha_tecnica_insumo (
    id_ficha_insumo   SERIAL PRIMARY KEY,
    id_ficha          INTEGER       NOT NULL,
    id_insumo         INTEGER       NOT NULL,
    cantidad          NUMERIC(12,2) NOT NULL,
    unidad_medida     VARCHAR(20)   NOT NULL,
    CONSTRAINT uq_fichainsumo_ficha_insumo UNIQUE (id_ficha, id_insumo),
    CONSTRAINT fk_fichainsumo_ficha FOREIGN KEY (id_ficha)
        REFERENCES ficha_tecnica (id_ficha) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_fichainsumo_insumo FOREIGN KEY (id_insumo)
        REFERENCES insumo (id_insumo) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_fichainsumo_cant CHECK (cantidad > 0)
);
COMMENT ON TABLE ficha_tecnica_insumo IS 'HU-061/062: insumos y cantidades que componen la receta (sin duplicados)';

-- ----------------------------------------------------------------------------
-- Tabla: producto (HU-088 a HU-098)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS producto (
    id_producto       SERIAL PRIMARY KEY,
    nombre            VARCHAR(100)  NOT NULL,
    descripcion       VARCHAR(255),
    id_categoria      INTEGER       NOT NULL,
    id_ficha          INTEGER,
    id_proveedor      INTEGER,
    precio_venta      NUMERIC(12,2) NOT NULL,
    imagen_url        VARCHAR(255),
    stock_actual      NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock_minimo      NUMERIC(12,2) NOT NULL DEFAULT 0,
    fecha_vencimiento DATE,
    estado            VARCHAR(10)   NOT NULL DEFAULT 'Activo',
    imagen_public_id VARCHAR(255),
    CONSTRAINT uq_producto_nombre UNIQUE (nombre),
    CONSTRAINT fk_producto_categoria FOREIGN KEY (id_categoria)
        REFERENCES categoria_producto (id_categoria) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_producto_ficha FOREIGN KEY (id_ficha)
        REFERENCES ficha_tecnica (id_ficha) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_producto_proveedor FOREIGN KEY (id_proveedor)
        REFERENCES proveedor (id_proveedor) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT ck_producto_precio CHECK (precio_venta >= 0),
    CONSTRAINT ck_producto_stock CHECK (stock_actual >= 0),
    CONSTRAINT ck_producto_stockmin CHECK (stock_minimo >= 0),
    CONSTRAINT ck_producto_estado CHECK (estado::text = ANY (ARRAY['Activo'::varchar::text, 'Inactivo'::varchar::text]))
);
COMMENT ON TABLE producto IS 'HU-088 a HU-098: catálogo de arepas (amarilla tela/media tela/extragrande, blanca, chócolo)';

-- ----------------------------------------------------------------------------
-- Tabla: compra (HU-034 a HU-044)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compra (
    id_compra         SERIAL PRIMARY KEY,
    id_proveedor      INTEGER       NOT NULL,
    id_usuario        INTEGER       NOT NULL,
    fecha_compra      DATE          NOT NULL DEFAULT CURRENT_DATE,
    valor_total       NUMERIC(14,2) NOT NULL DEFAULT 0,
    medio_pago        VARCHAR(20)   NOT NULL,
    comprobante_url   VARCHAR(255),
    estado            VARCHAR(15)   NOT NULL DEFAULT 'Registrada',
    fecha_registro    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    comprobante_public_id VARCHAR(255),
    comprobante_recurso   VARCHAR(10),
    CONSTRAINT fk_compra_proveedor FOREIGN KEY (id_proveedor)
        REFERENCES proveedor (id_proveedor) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_compra_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_compra_total CHECK (valor_total >= 0),
    CONSTRAINT ck_compra_mediopago CHECK (medio_pago::text = ANY (ARRAY['Efectivo'::varchar::text, 'Transferencia'::varchar::text, 'Credito'::varchar::text, 'Tarjeta'::varchar::text])),
    CONSTRAINT ck_compra_estado CHECK (estado::text = ANY (ARRAY['Registrada'::varchar::text, 'Anulada'::varchar::text])),
    CONSTRAINT ck_compra_comprobante_recurso CHECK (comprobante_recurso IS NULL OR comprobante_recurso IN ('image', 'raw'))
);
COMMENT ON TABLE compra IS 'HU-034 a HU-044: no se elimina, solo se anula (CA-039-001) conservando trazabilidad';
COMMENT ON COLUMN compra.comprobante_url IS 'CA-042: factura en PDF o imagen (HU-042)';

-- ----------------------------------------------------------------------------
-- Tabla: detalle_compra (Acta - Subproceso de compras)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS detalle_compra (
    id_detalle_compra SERIAL PRIMARY KEY,
    id_compra         INTEGER       NOT NULL,
    id_insumo         INTEGER       NOT NULL,
    cantidad          NUMERIC(12,2) NOT NULL,
    valor_unitario    NUMERIC(12,2) NOT NULL,
    subtotal          NUMERIC(14,2) NOT NULL,
    CONSTRAINT uq_detcompra_compra_insumo UNIQUE (id_compra, id_insumo),
    CONSTRAINT fk_detcompra_compra FOREIGN KEY (id_compra)
        REFERENCES compra (id_compra) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_detcompra_insumo FOREIGN KEY (id_insumo)
        REFERENCES insumo (id_insumo) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_detcompra_cant CHECK (cantidad > 0),
    CONSTRAINT ck_detcompra_valor CHECK (valor_unitario >= 0),
    CONSTRAINT ck_detcompra_subtotal CHECK (subtotal >= 0)
);
COMMENT ON TABLE detalle_compra IS 'Insumos y cantidades adquiridas en cada compra (Acta - Subproceso de compras)';

-- ----------------------------------------------------------------------------
-- Tabla: lote_produccion (HU-078 a HU-087)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lote_produccion (
    id_lote                SERIAL PRIMARY KEY,
    id_ficha               INTEGER       NOT NULL,
    id_usuario_responsable INTEGER       NOT NULL,
    fecha_produccion       DATE          NOT NULL DEFAULT CURRENT_DATE,
    cantidad_producida     NUMERIC(12,2) NOT NULL,
    estado                 VARCHAR(15)   NOT NULL DEFAULT 'En proceso',
    observaciones          VARCHAR(255),
    CONSTRAINT fk_lote_ficha FOREIGN KEY (id_ficha)
        REFERENCES ficha_tecnica (id_ficha) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_lote_usuario FOREIGN KEY (id_usuario_responsable)
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_lote_cant CHECK (cantidad_producida > 0),
    CONSTRAINT ck_lote_estado CHECK (estado::text = ANY (ARRAY['En proceso'::varchar::text, 'Terminado'::varchar::text, 'Anulado'::varchar::text]))
);
COMMENT ON TABLE lote_produccion IS 'HU-078 a HU-087: lotes de arepas producidos, trazabilidad operativa';

-- ----------------------------------------------------------------------------
-- Tabla: lote_produccion_insumo (HU-077/078)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lote_produccion_insumo (
    id_lote_insumo     SERIAL PRIMARY KEY,
    id_lote            INTEGER       NOT NULL,
    id_insumo          INTEGER       NOT NULL,
    cantidad_consumida NUMERIC(12,2) NOT NULL,
    CONSTRAINT uq_loteinsumo_lote_insumo UNIQUE (id_lote, id_insumo),
    CONSTRAINT fk_loteinsumo_lote FOREIGN KEY (id_lote)
        REFERENCES lote_produccion (id_lote) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_loteinsumo_insumo FOREIGN KEY (id_insumo)
        REFERENCES insumo (id_insumo) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_loteinsumo_cant CHECK (cantidad_consumida > 0)
);
COMMENT ON TABLE lote_produccion_insumo IS 'HU-077/078: insumos efectivamente descontados del inventario por lote producido';

-- ----------------------------------------------------------------------------
-- Tabla: cliente (HU-099 a HU-105, HU-150)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cliente (
    id_cliente        SERIAL PRIMARY KEY,
    nombre            VARCHAR(150) NOT NULL,
    documento         VARCHAR(20)  NOT NULL,
    telefono          VARCHAR(20),
    correo            VARCHAR(150),
    direccion         VARCHAR(255),
    estado            VARCHAR(10)  NOT NULL DEFAULT 'Activo',
    fecha_creacion    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario        INTEGER,
    tipo_documento    VARCHAR(5)   NOT NULL DEFAULT 'CC',
    municipio         VARCHAR(60),
    barrio            VARCHAR(80),
    tipo_persona     VARCHAR(10)  NOT NULL DEFAULT 'Natural',
    nombres          VARCHAR(75),
    apellidos        VARCHAR(74),
    razon_social     VARCHAR(150),
    CONSTRAINT uq_cliente_documento UNIQUE (documento),
    CONSTRAINT uq_cliente_usuario UNIQUE (id_usuario),
    CONSTRAINT fk_cliente_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
    CONSTRAINT ck_cliente_estado CHECK (estado::text = ANY (ARRAY['Activo'::varchar::text, 'Inactivo'::varchar::text])),
    CONSTRAINT ck_cliente_tipodocumento CHECK (tipo_documento IN ('CC', 'CE', 'NIT', 'PP', 'TI')),
    CONSTRAINT ck_cliente_tipopersona CHECK (tipo_persona IN ('Natural', 'Jurídica'))
);
COMMENT ON TABLE cliente IS 'HU-099 a HU-105: tiendas, supermercados y clientes al detal';

-- ----------------------------------------------------------------------------
-- Tabla: pedido (HU-106 a HU-120)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedido (
    id_pedido             SERIAL PRIMARY KEY,
    id_cliente            INTEGER       NOT NULL,
    id_sede               INTEGER       NOT NULL,
    id_usuario            INTEGER       NOT NULL,
    fecha_pedido          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega         DATE          NOT NULL,
    valor_total           NUMERIC(14,2) NOT NULL DEFAULT 0,
    estado                VARCHAR(20)   NOT NULL DEFAULT 'Pendiente',
    observaciones         VARCHAR(255),
    motivo_anulacion      VARCHAR(255),
    medio_pago            VARCHAR(20),
    comprobante_url       VARCHAR(255),
    direccion_entrega     VARCHAR(255),
    municipio_entrega     VARCHAR(60),
    barrio_entrega        VARCHAR(80),
    complemento_entrega   VARCHAR(120),
    indicaciones_entrega  VARCHAR(255),
    origen                VARCHAR(10)   NOT NULL DEFAULT 'personal',
    fecha_entregado       TIMESTAMP,
    fecha_anulacion       TIMESTAMP,
    stock_descontado      BOOLEAN       NOT NULL DEFAULT FALSE,
    id_venta_origen       INTEGER,
    CONSTRAINT fk_pedido_cliente FOREIGN KEY (id_cliente)
        REFERENCES cliente (id_cliente) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_pedido_sede FOREIGN KEY (id_sede)
        REFERENCES sede (id_sede) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_pedido_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_pedido_total CHECK (valor_total >= 0),
    CONSTRAINT ck_pedido_estado CHECK (estado IN ('Pendiente', 'En proceso', 'Entregado', 'Anulado')),
    CONSTRAINT ck_pedido_mediopago CHECK (medio_pago IS NULL OR medio_pago IN ('Efectivo', 'Tarjeta', 'Transferencia')),
    CONSTRAINT ck_pedido_origen CHECK (origen IN ('personal', 'app'))
);
COMMENT ON TABLE pedido IS 'HU-106 a HU-120: pedidos por cliente/sede, no se elimina, solo se anula (CA-111)';

-- ----------------------------------------------------------------------------
-- Tabla: venta (HU-121 a HU-132, histórica tras fusión en pedidos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venta (
    id_venta          SERIAL PRIMARY KEY,
    id_sede           INTEGER       NOT NULL,
    id_cliente        INTEGER       NOT NULL,
    id_usuario        INTEGER       NOT NULL,
    id_pedido         INTEGER,
    fecha_venta       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valor_total       NUMERIC(14,2) NOT NULL DEFAULT 0,
    medio_pago        VARCHAR(20)   NOT NULL,
    comprobante_url   VARCHAR(255),
    estado            VARCHAR(15)   NOT NULL DEFAULT 'Pendiente',
    CONSTRAINT fk_venta_sede FOREIGN KEY (id_sede)
        REFERENCES sede (id_sede) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_venta_cliente FOREIGN KEY (id_cliente)
        REFERENCES cliente (id_cliente) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_venta_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_venta_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido (id_pedido) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT ck_venta_total CHECK (valor_total >= 0),
    CONSTRAINT ck_venta_mediopago CHECK (medio_pago::text = ANY (ARRAY['Efectivo'::varchar::text, 'Transferencia'::varchar::text, 'Credito'::varchar::text, 'Tarjeta'::varchar::text])),
    CONSTRAINT ck_venta_estado CHECK (estado::text = ANY (ARRAY['Pendiente'::varchar::text, 'Pagada'::varchar::text, 'Anulada'::varchar::text]))
);
COMMENT ON TABLE venta IS 'HU-121 a HU-132: registrada directamente o asociada a un pedido previo (Acta - Subproceso de ventas)';

-- Clave foránea de pedido hacia venta_origen
ALTER TABLE pedido
    ADD CONSTRAINT fk_pedido_venta_origen FOREIGN KEY (id_venta_origen)
        REFERENCES venta (id_venta) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- Tabla: detalle_pedido (HU-112 a HU-116)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS detalle_pedido (
    id_detalle_pedido SERIAL PRIMARY KEY,
    id_pedido         INTEGER       NOT NULL,
    id_producto       INTEGER       NOT NULL,
    cantidad          NUMERIC(12,2) NOT NULL,
    precio_unitario   NUMERIC(12,2) NOT NULL,
    subtotal          NUMERIC(14,2) NOT NULL,
    CONSTRAINT uq_detpedido_pedido_producto UNIQUE (id_pedido, id_producto),
    CONSTRAINT fk_detpedido_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido (id_pedido) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_detpedido_producto FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_detpedido_cant CHECK (cantidad >= 1),
    CONSTRAINT ck_detpedido_precio CHECK (precio_unitario >= 0),
    CONSTRAINT ck_detpedido_subtotal CHECK (subtotal >= 0)
);
COMMENT ON TABLE detalle_pedido IS 'HU-112 a HU-116: productos, cantidades y subtotales de cada pedido';

-- ----------------------------------------------------------------------------
-- Tabla: detalle_venta (HU-126/127)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS detalle_venta (
    id_detalle_venta  SERIAL PRIMARY KEY,
    id_venta          INTEGER       NOT NULL,
    id_producto       INTEGER       NOT NULL,
    cantidad          NUMERIC(12,2) NOT NULL,
    precio_unitario   NUMERIC(12,2) NOT NULL,
    subtotal          NUMERIC(14,2) NOT NULL,
    CONSTRAINT uq_detventa_venta_producto UNIQUE (id_venta, id_producto),
    CONSTRAINT fk_detventa_venta FOREIGN KEY (id_venta)
        REFERENCES venta (id_venta) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_detventa_producto FOREIGN KEY (id_producto)
        REFERENCES producto (id_producto) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT ck_detventa_cant CHECK (cantidad >= 1),
    CONSTRAINT ck_detventa_precio CHECK (precio_unitario >= 0),
    CONSTRAINT ck_detventa_subtotal CHECK (subtotal >= 0)
);
COMMENT ON TABLE detalle_venta IS 'HU-126/127: productos vendidos, cantidades y subtotales de cada venta';

-- ----------------------------------------------------------------------------
-- Tabla: credito (HU-117, HU-161, HU-166, HU-167, HU-171)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Tabla: abono (HU-117 y Subproceso de Abonos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS abono (
    id_abono             SERIAL PRIMARY KEY,
    id_cliente           INTEGER       NOT NULL,
    id_pedido            INTEGER,
    id_venta             INTEGER,
    fecha_abono          DATE          NOT NULL DEFAULT CURRENT_DATE,
    valor_abonado        NUMERIC(12,2) NOT NULL,
    saldo_pendiente      NUMERIC(12,2) NOT NULL,
    medio_pago           VARCHAR(20)   NOT NULL,
    comprobante_url      VARCHAR(255),
    estado               VARCHAR(15)   NOT NULL DEFAULT 'En revisión',
    id_credito           INTEGER,
    fecha_registro       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_usuario_registra  INTEGER,
    id_usuario_revisa    INTEGER,
    fecha_revision       TIMESTAMP,
    motivo_rechazo       VARCHAR(255),
    motivo_anulacion     VARCHAR(255),
    CONSTRAINT fk_abono_cliente FOREIGN KEY (id_cliente)
        REFERENCES cliente (id_cliente) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_abono_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido (id_pedido) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_abono_venta FOREIGN KEY (id_venta)
        REFERENCES venta (id_venta) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_abono_credito FOREIGN KEY (id_credito)
        REFERENCES credito (id_credito) ON DELETE RESTRICT,
    CONSTRAINT fk_abono_usuario_registra FOREIGN KEY (id_usuario_registra)
        REFERENCES usuario (id_usuario) ON DELETE SET NULL,
    CONSTRAINT fk_abono_usuario_revisa FOREIGN KEY (id_usuario_revisa)
        REFERENCES usuario (id_usuario) ON DELETE SET NULL,
    CONSTRAINT ck_abono_referencia CHECK (id_pedido IS NOT NULL OR id_venta IS NOT NULL),
    CONSTRAINT ck_abono_valor CHECK (valor_abonado > 0),
    CONSTRAINT ck_abono_saldo CHECK (saldo_pendiente >= 0),
    CONSTRAINT ck_abono_mediopago CHECK (medio_pago::text = ANY (ARRAY['Efectivo'::varchar::text, 'Transferencia'::varchar::text, 'Credito'::varchar::text, 'Tarjeta'::varchar::text])),
    CONSTRAINT ck_abono_estado CHECK (estado IN ('En revisión', 'Aprobado', 'Rechazado', 'Anulado'))
);
COMMENT ON TABLE abono IS 'HU-117 y Acta (Subproceso de Abonos): pago parcial sobre UN pedido O UNA venta (nunca ambos ni ninguno)';

-- ----------------------------------------------------------------------------
-- Tabla: pedido_estado_historial (HU-109, HU-118, CA-111-002)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedido_estado_historial (
    id_historial    SERIAL PRIMARY KEY,
    id_pedido       INTEGER     NOT NULL,
    estado_anterior VARCHAR(20),
    estado_nuevo    VARCHAR(20) NOT NULL,
    id_usuario      INTEGER,
    motivo          VARCHAR(255),
    fecha_cambio    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reconstruido    BOOLEAN     NOT NULL DEFAULT FALSE,
    CONSTRAINT pedido_estado_historial_id_pedido_fkey FOREIGN KEY (id_pedido)
        REFERENCES pedido (id_pedido),
    CONSTRAINT pedido_estado_historial_id_usuario_fkey FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario),
    CONSTRAINT ck_historial_estado_nuevo CHECK (estado_nuevo IN ('Pendiente', 'En proceso', 'Entregado', 'Anulado')),
    CONSTRAINT ck_historial_estado_anterior CHECK (estado_anterior IS NULL OR estado_anterior IN ('Pendiente', 'En proceso', 'Entregado', 'Anulado'))
);

-- ----------------------------------------------------------------------------
-- Tabla: notificacion (HU-168, HU-169)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificacion (
    id_notificacion SERIAL PRIMARY KEY,
    id_usuario      INTEGER      NOT NULL,
    id_pedido       INTEGER,
    id_abono        INTEGER,
    tipo            VARCHAR(30)  NOT NULL,
    titulo          VARCHAR(120) NOT NULL,
    mensaje         VARCHAR(500) NOT NULL,
    leida           BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_creacion  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura   TIMESTAMP,
    CONSTRAINT fk_notificacion_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_notificacion_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedido (id_pedido) ON DELETE SET NULL,
    CONSTRAINT fk_notificacion_abono FOREIGN KEY (id_abono)
        REFERENCES abono (id_abono) ON DELETE SET NULL,
    CONSTRAINT ck_notificacion_tipo CHECK (tipo IN ('pedido_creado', 'pedido_estado', 'abono_aprobado', 'abono_rechazado'))
);

-- ----------------------------------------------------------------------------
-- Tabla: auditoria (Bitácora de seguridad)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria (
    id_auditoria         SERIAL PRIMARY KEY,
    id_usuario           INTEGER,
    tabla_afectada       VARCHAR(50) NOT NULL,
    id_registro_afectado INTEGER,
    accion               VARCHAR(20) NOT NULL,
    detalle              TEXT,
    fecha_evento         TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuario (id_usuario) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT ck_auditoria_accion CHECK (accion::text = ANY (ARRAY['INSERT'::varchar::text, 'UPDATE'::varchar::text, 'DELETE'::varchar::text, 'ANULACION'::varchar::text, 'CAMBIO_ESTADO'::varchar::text]))
);
COMMENT ON TABLE auditoria IS 'Bitácora de auditoría (Manual Técnico - Regla de Negocio de Roles, generalizada)';

-- ============================================================================
-- 3. ÍNDICES ADICIONALES
-- ============================================================================

-- Índices B-Tree
CREATE INDEX IF NOT EXISTS idx_abono_credito ON abono (id_credito);
CREATE INDEX IF NOT EXISTS idx_abono_estado ON abono (estado);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabla ON auditoria (tabla_afectada, id_registro_afectado);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria (id_usuario);
CREATE INDEX IF NOT EXISTS idx_cliente_estado ON cliente (estado);
CREATE INDEX IF NOT EXISTS idx_compra_estado ON compra (estado);
CREATE INDEX IF NOT EXISTS idx_compra_fecha ON compra (fecha_compra);
CREATE INDEX IF NOT EXISTS idx_compra_proveedor ON compra (id_proveedor);
CREATE INDEX IF NOT EXISTS idx_credito_cliente ON credito (id_cliente);
CREATE INDEX IF NOT EXISTS idx_detalle_pedido_pedido ON detalle_pedido (id_pedido);
CREATE INDEX IF NOT EXISTS idx_detpedido_producto ON detalle_pedido (id_producto);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_venta ON detalle_venta (id_venta);
CREATE INDEX IF NOT EXISTS idx_detventa_producto ON detalle_venta (id_producto);
CREATE INDEX IF NOT EXISTS idx_insumo_estado ON insumo (estado);
CREATE INDEX IF NOT EXISTS idx_insumo_proveedor ON insumo (id_proveedor);
CREATE INDEX IF NOT EXISTS idx_lote_estado ON lote_produccion (estado);
CREATE INDEX IF NOT EXISTS idx_lote_fecha ON lote_produccion (fecha_produccion);
CREATE INDEX IF NOT EXISTS idx_lote_produccion_ficha ON lote_produccion (id_ficha);
CREATE INDEX IF NOT EXISTS idx_notificacion_usuario ON notificacion (id_usuario, leida, fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_pedido_cliente ON pedido (id_cliente);
CREATE INDEX IF NOT EXISTS idx_pedido_estado ON pedido (estado);
CREATE INDEX IF NOT EXISTS idx_pedido_fecha ON pedido (fecha_pedido);
CREATE INDEX IF NOT EXISTS idx_pedido_sede ON pedido (id_sede);
CREATE INDEX IF NOT EXISTS ix_historial_pedido_fecha ON pedido_estado_historial (id_pedido, fecha_cambio);
CREATE INDEX IF NOT EXISTS idx_producto_categoria ON producto (id_categoria);
CREATE INDEX IF NOT EXISTS idx_producto_estado ON producto (estado);
CREATE INDEX IF NOT EXISTS idx_producto_ficha ON producto (id_ficha);
CREATE INDEX IF NOT EXISTS idx_proveedor_estado ON proveedor (estado);
CREATE INDEX IF NOT EXISTS idx_usuario_estado ON usuario (estado);
CREATE INDEX IF NOT EXISTS idx_venta_cliente ON venta (id_cliente);
CREATE INDEX IF NOT EXISTS idx_venta_estado ON venta (estado);
CREATE INDEX IF NOT EXISTS idx_venta_fecha ON venta (fecha_venta);
CREATE INDEX IF NOT EXISTS idx_venta_pedido ON venta (id_pedido);
CREATE INDEX IF NOT EXISTS idx_venta_sede ON venta (id_sede);

-- Índices GIN con trigram ops para búsquedas eficientes por nombre (pg_trgm)
CREATE INDEX IF NOT EXISTS idx_categoria_nombre ON categoria_producto USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cliente_nombre ON cliente USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ficha_nombre ON ficha_tecnica USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_insumo_nombre ON insumo USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_producto_nombre ON producto USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_proveedor_nombre ON proveedor USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_usuario_nombre ON usuario USING gin (nombre gin_trgm_ops);

-- Índices únicos insensibles a mayúsculas para correos electrónicos (CA-150-002)
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuario_correo_lower ON usuario (LOWER(correo));
CREATE UNIQUE INDEX IF NOT EXISTS ux_usuario_documento ON usuario (documento) WHERE documento IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_cliente_correo_lower ON cliente (LOWER(correo)) WHERE correo IS NOT NULL;

-- ============================================================================
-- 4. DATOS BASE DEL SISTEMA (ROLES, PERMISOS Y MATRIZ ROL_PERMISO)
-- ============================================================================

-- Roles del sistema
INSERT INTO rol (id_rol, nombre, descripcion, estado) VALUES
(1, 'Administrador', 'Acceso total a todos los módulos y configuración del sistema', 'Activo'),
(2, 'Secretaria', 'Gestión operativa de compras, insumos, producción, pedidos y ventas', 'Activo'),
(3, 'Vendedor', 'Gestión comercial, atención a clientes, registro de pedidos y ventas', 'Activo'),
(4, 'Domiciliario', 'Logística de despacho y entrega de pedidos a clientes y sedes', 'Activo'),
(5, 'Cliente', 'Cliente que hace pedidos desde la aplicación móvil', 'Activo')
ON CONFLICT (nombre) DO UPDATE
SET descripcion = EXCLUDED.descripcion, estado = EXCLUDED.estado;

SELECT setval('cenarepas.rol_id_rol_seq', (SELECT MAX(id_rol) FROM rol));

-- Catálogo de Permisos (16 módulos x 7 acciones = 112 permisos)
INSERT INTO permiso (modulo, accion, estado)
SELECT m, a, 'Activo'
FROM unnest(ARRAY[
  'abonos', 'categorias', 'clientes', 'compras', 'configuracion', 'dashboard',
  'fichas-tecnicas', 'insumos', 'pedidos', 'produccion', 'productos',
  'proveedores', 'roles', 'sedes', 'usuarios', 'ventas'
]) AS m
CROSS JOIN unnest(ARRAY[
  'ver', 'crear', 'editar', 'eliminar', 'cambiar_estado', 'exportar', 'anular'
]) AS a
ON CONFLICT (modulo, accion) DO NOTHING;

SELECT setval('cenarepas.permiso_id_permiso_seq', (SELECT MAX(id_permiso) FROM permiso));

-- Matriz de Asignación rol_permiso:

-- 1. Administrador: todos los permisos (112)
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT 1, p.id_permiso
FROM permiso p
ON CONFLICT DO NOTHING;

-- 2. Secretaria: 78 permisos
--    11 módulos completos (77) + fichas-tecnicas:ver (1)
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT 2, p.id_permiso
FROM permiso p
WHERE (p.modulo IN ('abonos', 'categorias', 'clientes', 'compras', 'dashboard',
                    'insumos', 'pedidos', 'produccion', 'productos', 'proveedores', 'ventas'))
   OR (p.modulo = 'fichas-tecnicas' AND p.accion = 'ver')
ON CONFLICT DO NOTHING;

-- 3. Vendedor: 22 permisos
--    abonos (ver, crear, anular, cambiar_estado: 4)
--    categorias (ver: 1)
--    clientes (ver, crear, editar: 3)
--    fichas-tecnicas (ver: 1)
--    pedidos (ver, crear, editar, anular, cambiar_estado, exportar: 6)
--    productos (ver: 1)
--    ventas (ver, crear, editar, anular, cambiar_estado, exportar: 6)
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT 3, p.id_permiso
FROM permiso p
WHERE (p.modulo = 'abonos' AND p.accion IN ('ver', 'crear', 'anular', 'cambiar_estado'))
   OR (p.modulo = 'categorias' AND p.accion = 'ver')
   OR (p.modulo = 'clientes' AND p.accion IN ('ver', 'crear', 'editar'))
   OR (p.modulo = 'fichas-tecnicas' AND p.accion = 'ver')
   OR (p.modulo = 'pedidos' AND p.accion IN ('ver', 'crear', 'editar', 'anular', 'cambiar_estado', 'exportar'))
   OR (p.modulo = 'productos' AND p.accion = 'ver')
   OR (p.modulo = 'ventas' AND p.accion IN ('ver', 'crear', 'editar', 'anular', 'cambiar_estado', 'exportar'))
ON CONFLICT DO NOTHING;

COMMIT;
