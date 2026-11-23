-- CenArepa_v2.sql · DDL completo y actualizado de la base CENAREPAS
-- Generado con pg_dump --schema-only desde cenarepas_staging el 2026-09-25,
-- después de aplicar Base_Datos/migraciones/001 a 006.
-- Incluye las restricciones ck_* reales de la base (que CenArepa.sql no refleja).
-- NO reemplaza a CenArepa.sql: es la referencia para actualizar la documentación.
-- No contiene datos.
-- Requiere la extensión pg_trgm (índices de búsqueda por nombre).

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;

--
-- PostgreSQL database dump
--



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: cenarepas; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA cenarepas;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: abono; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.abono (
    id_abono integer NOT NULL,
    id_cliente integer NOT NULL,
    id_pedido integer,
    id_venta integer,
    fecha_abono date DEFAULT CURRENT_DATE NOT NULL,
    valor_abonado numeric(12,2) NOT NULL,
    saldo_pendiente numeric(12,2) NOT NULL,
    medio_pago character varying(20) NOT NULL,
    comprobante_url character varying(255),
    estado character varying(15) DEFAULT 'En revisión'::character varying NOT NULL,
    id_credito integer,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_usuario_registra integer,
    id_usuario_revisa integer,
    fecha_revision timestamp without time zone,
    motivo_rechazo character varying(255),
    motivo_anulacion character varying(255),
    CONSTRAINT ck_abono_estado CHECK (((estado)::text = ANY ((ARRAY['En revisión'::character varying, 'Aprobado'::character varying, 'Rechazado'::character varying, 'Anulado'::character varying])::text[]))),
    CONSTRAINT ck_abono_mediopago CHECK (((medio_pago)::text = ANY (ARRAY[('Efectivo'::character varying)::text, ('Transferencia'::character varying)::text, ('Credito'::character varying)::text, ('Tarjeta'::character varying)::text]))),
    CONSTRAINT ck_abono_referencia CHECK (((id_pedido IS NOT NULL) OR (id_venta IS NOT NULL))),
    CONSTRAINT ck_abono_saldo CHECK ((saldo_pendiente >= (0)::numeric)),
    CONSTRAINT ck_abono_valor CHECK ((valor_abonado > (0)::numeric))
);


--
-- Name: abono_id_abono_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.abono_id_abono_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: abono_id_abono_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.abono_id_abono_seq OWNED BY cenarepas.abono.id_abono;


--
-- Name: auditoria; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.auditoria (
    id_auditoria integer NOT NULL,
    id_usuario integer,
    tabla_afectada character varying(50) NOT NULL,
    id_registro_afectado integer,
    accion character varying(20) NOT NULL,
    detalle text,
    fecha_evento timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_auditoria_accion CHECK (((accion)::text = ANY (ARRAY[('INSERT'::character varying)::text, ('UPDATE'::character varying)::text, ('DELETE'::character varying)::text, ('ANULACION'::character varying)::text, ('CAMBIO_ESTADO'::character varying)::text])))
);


--
-- Name: auditoria_id_auditoria_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.auditoria_id_auditoria_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auditoria_id_auditoria_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.auditoria_id_auditoria_seq OWNED BY cenarepas.auditoria.id_auditoria;


--
-- Name: categoria_producto; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.categoria_producto (
    id_categoria integer NOT NULL,
    nombre character varying(80) NOT NULL,
    descripcion character varying(255),
    estado character varying(10) DEFAULT 'Activo'::character varying NOT NULL,
    imagen_url character varying(255),
    CONSTRAINT ck_categoria_estado CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text])))
);


--
-- Name: categoria_producto_id_categoria_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.categoria_producto_id_categoria_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categoria_producto_id_categoria_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.categoria_producto_id_categoria_seq OWNED BY cenarepas.categoria_producto.id_categoria;


--
-- Name: cliente; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.cliente (
    id_cliente integer NOT NULL,
    nombre character varying(150) NOT NULL,
    documento character varying(20) NOT NULL,
    telefono character varying(20),
    correo character varying(150),
    direccion character varying(255),
    estado character varying(10) DEFAULT 'Activo'::character varying NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_usuario integer,
    tipo_documento character varying(5) DEFAULT 'CC'::character varying NOT NULL,
    municipio character varying(60),
    barrio character varying(80),
    CONSTRAINT ck_cliente_estado CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text]))),
    CONSTRAINT ck_cliente_tipodocumento CHECK (((tipo_documento)::text = ANY ((ARRAY['CC'::character varying, 'CE'::character varying, 'NIT'::character varying, 'PP'::character varying, 'TI'::character varying])::text[])))
);


--
-- Name: cliente_id_cliente_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.cliente_id_cliente_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cliente_id_cliente_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.cliente_id_cliente_seq OWNED BY cenarepas.cliente.id_cliente;


--
-- Name: compra; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.compra (
    id_compra integer NOT NULL,
    id_proveedor integer NOT NULL,
    id_usuario integer NOT NULL,
    fecha_compra date DEFAULT CURRENT_DATE NOT NULL,
    valor_total numeric(14,2) DEFAULT 0 NOT NULL,
    medio_pago character varying(20) NOT NULL,
    comprobante_url character varying(255),
    estado character varying(15) DEFAULT 'Registrada'::character varying NOT NULL,
    fecha_registro timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_compra_estado CHECK (((estado)::text = ANY (ARRAY[('Registrada'::character varying)::text, ('Anulada'::character varying)::text]))),
    CONSTRAINT ck_compra_mediopago CHECK (((medio_pago)::text = ANY (ARRAY[('Efectivo'::character varying)::text, ('Transferencia'::character varying)::text, ('Credito'::character varying)::text, ('Tarjeta'::character varying)::text]))),
    CONSTRAINT ck_compra_total CHECK ((valor_total >= (0)::numeric))
);


--
-- Name: compra_id_compra_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.compra_id_compra_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: compra_id_compra_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.compra_id_compra_seq OWNED BY cenarepas.compra.id_compra;


--
-- Name: credito; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.credito (
    id_credito integer NOT NULL,
    id_pedido integer NOT NULL,
    id_cliente integer NOT NULL,
    valor_total numeric(14,2) NOT NULL,
    valor_abonado numeric(14,2) DEFAULT 0 NOT NULL,
    saldo_pendiente numeric(14,2) NOT NULL,
    estado character varying(10) DEFAULT 'Activo'::character varying NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_credito_estado CHECK (((estado)::text = ANY ((ARRAY['Activo'::character varying, 'Pagado'::character varying, 'Anulado'::character varying])::text[]))),
    CONSTRAINT ck_credito_valores CHECK (((valor_total > (0)::numeric) AND (valor_abonado >= (0)::numeric) AND (saldo_pendiente >= (0)::numeric)))
);


--
-- Name: credito_id_credito_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.credito_id_credito_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: credito_id_credito_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.credito_id_credito_seq OWNED BY cenarepas.credito.id_credito;


--
-- Name: detalle_compra; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.detalle_compra (
    id_detalle_compra integer NOT NULL,
    id_compra integer NOT NULL,
    id_insumo integer NOT NULL,
    cantidad numeric(12,2) NOT NULL,
    valor_unitario numeric(12,2) NOT NULL,
    subtotal numeric(14,2) NOT NULL,
    CONSTRAINT ck_detcompra_cant CHECK ((cantidad > (0)::numeric)),
    CONSTRAINT ck_detcompra_subtotal CHECK ((subtotal >= (0)::numeric)),
    CONSTRAINT ck_detcompra_valor CHECK ((valor_unitario >= (0)::numeric))
);


--
-- Name: detalle_compra_id_detalle_compra_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.detalle_compra_id_detalle_compra_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_compra_id_detalle_compra_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.detalle_compra_id_detalle_compra_seq OWNED BY cenarepas.detalle_compra.id_detalle_compra;


--
-- Name: detalle_pedido; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.detalle_pedido (
    id_detalle_pedido integer NOT NULL,
    id_pedido integer NOT NULL,
    id_producto integer NOT NULL,
    cantidad numeric(12,2) NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    subtotal numeric(14,2) NOT NULL,
    CONSTRAINT ck_detpedido_cant CHECK ((cantidad >= (1)::numeric)),
    CONSTRAINT ck_detpedido_precio CHECK ((precio_unitario >= (0)::numeric)),
    CONSTRAINT ck_detpedido_subtotal CHECK ((subtotal >= (0)::numeric))
);


--
-- Name: detalle_pedido_id_detalle_pedido_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.detalle_pedido_id_detalle_pedido_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_pedido_id_detalle_pedido_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.detalle_pedido_id_detalle_pedido_seq OWNED BY cenarepas.detalle_pedido.id_detalle_pedido;


--
-- Name: detalle_venta; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.detalle_venta (
    id_detalle_venta integer NOT NULL,
    id_venta integer NOT NULL,
    id_producto integer NOT NULL,
    cantidad numeric(12,2) NOT NULL,
    precio_unitario numeric(12,2) NOT NULL,
    subtotal numeric(14,2) NOT NULL,
    CONSTRAINT ck_detventa_cant CHECK ((cantidad >= (1)::numeric)),
    CONSTRAINT ck_detventa_precio CHECK ((precio_unitario >= (0)::numeric)),
    CONSTRAINT ck_detventa_subtotal CHECK ((subtotal >= (0)::numeric))
);


--
-- Name: detalle_venta_id_detalle_venta_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.detalle_venta_id_detalle_venta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: detalle_venta_id_detalle_venta_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.detalle_venta_id_detalle_venta_seq OWNED BY cenarepas.detalle_venta.id_detalle_venta;


--
-- Name: ficha_tecnica; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.ficha_tecnica (
    id_ficha integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255),
    instrucciones_preparacion text,
    tiempo_estimado_minutos integer,
    rendimiento_lote numeric(12,2),
    estado character varying(10) DEFAULT 'Activo'::character varying NOT NULL,
    CONSTRAINT ck_ficha_estado CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text]))),
    CONSTRAINT ck_ficha_rendimiento CHECK ((rendimiento_lote > (0)::numeric)),
    CONSTRAINT ck_ficha_tiempo CHECK ((tiempo_estimado_minutos > 0))
);


--
-- Name: ficha_tecnica_id_ficha_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.ficha_tecnica_id_ficha_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ficha_tecnica_id_ficha_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.ficha_tecnica_id_ficha_seq OWNED BY cenarepas.ficha_tecnica.id_ficha;


--
-- Name: ficha_tecnica_insumo; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.ficha_tecnica_insumo (
    id_ficha_insumo integer NOT NULL,
    id_ficha integer NOT NULL,
    id_insumo integer NOT NULL,
    cantidad numeric(12,2) NOT NULL,
    unidad_medida character varying(20) NOT NULL,
    CONSTRAINT ck_fichainsumo_cant CHECK ((cantidad > (0)::numeric))
);


--
-- Name: ficha_tecnica_insumo_id_ficha_insumo_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.ficha_tecnica_insumo_id_ficha_insumo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ficha_tecnica_insumo_id_ficha_insumo_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.ficha_tecnica_insumo_id_ficha_insumo_seq OWNED BY cenarepas.ficha_tecnica_insumo.id_ficha_insumo;


--
-- Name: insumo; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.insumo (
    id_insumo integer NOT NULL,
    nombre character varying(100) NOT NULL,
    unidad_medida character varying(20) NOT NULL,
    stock_actual numeric(12,2) DEFAULT 0 NOT NULL,
    stock_minimo numeric(12,2) DEFAULT 0 NOT NULL,
    fecha_vencimiento date,
    id_proveedor integer,
    estado character varying(10) DEFAULT 'Activo'::character varying NOT NULL,
    CONSTRAINT ck_insumo_estado CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text]))),
    CONSTRAINT ck_insumo_stock CHECK ((stock_actual >= (0)::numeric)),
    CONSTRAINT ck_insumo_stock_min CHECK ((stock_minimo >= (0)::numeric))
);


--
-- Name: insumo_id_insumo_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.insumo_id_insumo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: insumo_id_insumo_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.insumo_id_insumo_seq OWNED BY cenarepas.insumo.id_insumo;


--
-- Name: lote_produccion; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.lote_produccion (
    id_lote integer NOT NULL,
    id_ficha integer NOT NULL,
    id_usuario_responsable integer NOT NULL,
    fecha_produccion date DEFAULT CURRENT_DATE NOT NULL,
    cantidad_producida numeric(12,2) NOT NULL,
    estado character varying(15) DEFAULT 'En proceso'::character varying NOT NULL,
    observaciones character varying(255),
    CONSTRAINT ck_lote_cant CHECK ((cantidad_producida > (0)::numeric)),
    CONSTRAINT ck_lote_estado CHECK (((estado)::text = ANY (ARRAY[('En proceso'::character varying)::text, ('Terminado'::character varying)::text, ('Anulado'::character varying)::text])))
);


--
-- Name: lote_produccion_id_lote_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.lote_produccion_id_lote_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lote_produccion_id_lote_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.lote_produccion_id_lote_seq OWNED BY cenarepas.lote_produccion.id_lote;


--
-- Name: lote_produccion_insumo; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.lote_produccion_insumo (
    id_lote_insumo integer NOT NULL,
    id_lote integer NOT NULL,
    id_insumo integer NOT NULL,
    cantidad_consumida numeric(12,2) NOT NULL,
    CONSTRAINT ck_loteinsumo_cant CHECK ((cantidad_consumida > (0)::numeric))
);


--
-- Name: lote_produccion_insumo_id_lote_insumo_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.lote_produccion_insumo_id_lote_insumo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lote_produccion_insumo_id_lote_insumo_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.lote_produccion_insumo_id_lote_insumo_seq OWNED BY cenarepas.lote_produccion_insumo.id_lote_insumo;


--
-- Name: notificacion; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.notificacion (
    id_notificacion integer NOT NULL,
    id_usuario integer NOT NULL,
    id_pedido integer,
    id_abono integer,
    tipo character varying(30) NOT NULL,
    titulo character varying(120) NOT NULL,
    mensaje character varying(500) NOT NULL,
    leida boolean DEFAULT false NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_lectura timestamp without time zone,
    CONSTRAINT ck_notificacion_tipo CHECK (((tipo)::text = ANY ((ARRAY['pedido_creado'::character varying, 'pedido_estado'::character varying, 'abono_aprobado'::character varying, 'abono_rechazado'::character varying])::text[])))
);


--
-- Name: notificacion_id_notificacion_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.notificacion_id_notificacion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notificacion_id_notificacion_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.notificacion_id_notificacion_seq OWNED BY cenarepas.notificacion.id_notificacion;


--
-- Name: pedido; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.pedido (
    id_pedido integer NOT NULL,
    id_cliente integer NOT NULL,
    id_sede integer NOT NULL,
    id_usuario integer NOT NULL,
    fecha_pedido timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_entrega date NOT NULL,
    valor_total numeric(14,2) DEFAULT 0 NOT NULL,
    estado character varying(20) DEFAULT 'Pendiente'::character varying NOT NULL,
    observaciones character varying(255),
    motivo_anulacion character varying(255),
    medio_pago character varying(20),
    comprobante_url character varying(255),
    direccion_entrega character varying(255),
    municipio_entrega character varying(60),
    barrio_entrega character varying(80),
    complemento_entrega character varying(120),
    indicaciones_entrega character varying(255),
    origen character varying(10) DEFAULT 'personal'::character varying NOT NULL,
    fecha_entregado timestamp without time zone,
    fecha_anulacion timestamp without time zone,
    stock_descontado boolean DEFAULT false NOT NULL,
    id_venta_origen integer,
    CONSTRAINT ck_pedido_estado CHECK (((estado)::text = ANY ((ARRAY['Pendiente'::character varying, 'En proceso'::character varying, 'Entregado'::character varying, 'Anulado'::character varying])::text[]))),
    CONSTRAINT ck_pedido_mediopago CHECK (((medio_pago IS NULL) OR ((medio_pago)::text = ANY ((ARRAY['Efectivo'::character varying, 'Tarjeta'::character varying, 'Transferencia'::character varying])::text[])))),
    CONSTRAINT ck_pedido_origen CHECK (((origen)::text = ANY ((ARRAY['personal'::character varying, 'app'::character varying])::text[]))),
    CONSTRAINT ck_pedido_total CHECK ((valor_total >= (0)::numeric))
);


--
-- Name: pedido_id_pedido_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.pedido_id_pedido_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pedido_id_pedido_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.pedido_id_pedido_seq OWNED BY cenarepas.pedido.id_pedido;


--
-- Name: permiso; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.permiso (
    id_permiso integer NOT NULL,
    modulo character varying(50) NOT NULL,
    accion character varying(50) NOT NULL,
    estado character varying(10) DEFAULT 'Activo'::character varying NOT NULL,
    CONSTRAINT ck_permiso_estado CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text])))
);


--
-- Name: permiso_id_permiso_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.permiso_id_permiso_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: permiso_id_permiso_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.permiso_id_permiso_seq OWNED BY cenarepas.permiso.id_permiso;


--
-- Name: producto; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.producto (
    id_producto integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion character varying(255),
    id_categoria integer NOT NULL,
    id_ficha integer,
    id_proveedor integer,
    precio_venta numeric(12,2) NOT NULL,
    imagen_url character varying(255),
    stock_actual numeric(12,2) DEFAULT 0 NOT NULL,
    stock_minimo numeric(12,2) DEFAULT 0 NOT NULL,
    fecha_vencimiento date,
    estado character varying(10) DEFAULT 'Activo'::character varying NOT NULL,
    CONSTRAINT ck_producto_estado CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text]))),
    CONSTRAINT ck_producto_precio CHECK ((precio_venta >= (0)::numeric)),
    CONSTRAINT ck_producto_stock CHECK ((stock_actual >= (0)::numeric)),
    CONSTRAINT ck_producto_stockmin CHECK ((stock_minimo >= (0)::numeric))
);


--
-- Name: producto_id_producto_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.producto_id_producto_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: producto_id_producto_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.producto_id_producto_seq OWNED BY cenarepas.producto.id_producto;


--
-- Name: proveedor; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.proveedor (
    id_proveedor integer NOT NULL,
    nombre character varying(150) NOT NULL,
    nit character varying(20) NOT NULL,
    telefono character varying(20),
    correo character varying(150),
    direccion character varying(255),
    estado character varying(10) DEFAULT 'Activo'::character varying NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_proveedor_estado CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text])))
);


--
-- Name: proveedor_id_proveedor_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.proveedor_id_proveedor_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proveedor_id_proveedor_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.proveedor_id_proveedor_seq OWNED BY cenarepas.proveedor.id_proveedor;


--
-- Name: rol; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.rol (
    id_rol integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(255),
    estado character varying(10) DEFAULT 'Activo'::character varying NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_rol_estado CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text])))
);


--
-- Name: rol_id_rol_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.rol_id_rol_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rol_id_rol_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.rol_id_rol_seq OWNED BY cenarepas.rol.id_rol;


--
-- Name: rol_permiso; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.rol_permiso (
    id_rol integer NOT NULL,
    id_permiso integer NOT NULL
);


--
-- Name: sede; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.sede (
    id_sede integer NOT NULL,
    nombre character varying(80) NOT NULL,
    direccion character varying(255) NOT NULL,
    telefono character varying(20),
    horario_atencion character varying(100),
    responsable character varying(100),
    estado character varying(10) DEFAULT 'Activo'::character varying NOT NULL,
    CONSTRAINT ck_sede_estado CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text])))
);


--
-- Name: sede_id_sede_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.sede_id_sede_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sede_id_sede_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.sede_id_sede_seq OWNED BY cenarepas.sede.id_sede;


--
-- Name: usuario; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.usuario (
    id_usuario integer NOT NULL,
    nombre character varying(100) NOT NULL,
    correo character varying(150) NOT NULL,
    contrasena_hash character varying(255) NOT NULL,
    id_rol integer NOT NULL,
    estado character varying(10) DEFAULT 'Activo'::character varying NOT NULL,
    token_recuperacion character varying(255),
    token_expiracion timestamp without time zone,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT ck_usuario_estado CHECK (((estado)::text = ANY (ARRAY[('Activo'::character varying)::text, ('Inactivo'::character varying)::text])))
);


--
-- Name: usuario_id_usuario_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.usuario_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuario_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.usuario_id_usuario_seq OWNED BY cenarepas.usuario.id_usuario;


--
-- Name: venta; Type: TABLE; Schema: cenarepas; Owner: -
--

CREATE TABLE cenarepas.venta (
    id_venta integer NOT NULL,
    id_sede integer NOT NULL,
    id_cliente integer NOT NULL,
    id_usuario integer NOT NULL,
    id_pedido integer,
    fecha_venta timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    valor_total numeric(14,2) DEFAULT 0 NOT NULL,
    medio_pago character varying(20) NOT NULL,
    comprobante_url character varying(255),
    estado character varying(15) DEFAULT 'Pendiente'::character varying NOT NULL,
    CONSTRAINT ck_venta_estado CHECK (((estado)::text = ANY (ARRAY[('Pendiente'::character varying)::text, ('Pagada'::character varying)::text, ('Anulada'::character varying)::text]))),
    CONSTRAINT ck_venta_mediopago CHECK (((medio_pago)::text = ANY (ARRAY[('Efectivo'::character varying)::text, ('Transferencia'::character varying)::text, ('Credito'::character varying)::text, ('Tarjeta'::character varying)::text]))),
    CONSTRAINT ck_venta_total CHECK ((valor_total >= (0)::numeric))
);


--
-- Name: venta_id_venta_seq; Type: SEQUENCE; Schema: cenarepas; Owner: -
--

CREATE SEQUENCE cenarepas.venta_id_venta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: venta_id_venta_seq; Type: SEQUENCE OWNED BY; Schema: cenarepas; Owner: -
--

ALTER SEQUENCE cenarepas.venta_id_venta_seq OWNED BY cenarepas.venta.id_venta;


--
-- Name: abono id_abono; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.abono ALTER COLUMN id_abono SET DEFAULT nextval('cenarepas.abono_id_abono_seq'::regclass);


--
-- Name: auditoria id_auditoria; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.auditoria ALTER COLUMN id_auditoria SET DEFAULT nextval('cenarepas.auditoria_id_auditoria_seq'::regclass);


--
-- Name: categoria_producto id_categoria; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.categoria_producto ALTER COLUMN id_categoria SET DEFAULT nextval('cenarepas.categoria_producto_id_categoria_seq'::regclass);


--
-- Name: cliente id_cliente; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.cliente ALTER COLUMN id_cliente SET DEFAULT nextval('cenarepas.cliente_id_cliente_seq'::regclass);


--
-- Name: compra id_compra; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.compra ALTER COLUMN id_compra SET DEFAULT nextval('cenarepas.compra_id_compra_seq'::regclass);


--
-- Name: credito id_credito; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.credito ALTER COLUMN id_credito SET DEFAULT nextval('cenarepas.credito_id_credito_seq'::regclass);


--
-- Name: detalle_compra id_detalle_compra; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.detalle_compra ALTER COLUMN id_detalle_compra SET DEFAULT nextval('cenarepas.detalle_compra_id_detalle_compra_seq'::regclass);


--
-- Name: detalle_pedido id_detalle_pedido; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.detalle_pedido ALTER COLUMN id_detalle_pedido SET DEFAULT nextval('cenarepas.detalle_pedido_id_detalle_pedido_seq'::regclass);


--
-- Name: detalle_venta id_detalle_venta; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.detalle_venta ALTER COLUMN id_detalle_venta SET DEFAULT nextval('cenarepas.detalle_venta_id_detalle_venta_seq'::regclass);


--
-- Name: ficha_tecnica id_ficha; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.ficha_tecnica ALTER COLUMN id_ficha SET DEFAULT nextval('cenarepas.ficha_tecnica_id_ficha_seq'::regclass);


--
-- Name: ficha_tecnica_insumo id_ficha_insumo; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.ficha_tecnica_insumo ALTER COLUMN id_ficha_insumo SET DEFAULT nextval('cenarepas.ficha_tecnica_insumo_id_ficha_insumo_seq'::regclass);


--
-- Name: insumo id_insumo; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.insumo ALTER COLUMN id_insumo SET DEFAULT nextval('cenarepas.insumo_id_insumo_seq'::regclass);


--
-- Name: lote_produccion id_lote; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.lote_produccion ALTER COLUMN id_lote SET DEFAULT nextval('cenarepas.lote_produccion_id_lote_seq'::regclass);


--
-- Name: lote_produccion_insumo id_lote_insumo; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.lote_produccion_insumo ALTER COLUMN id_lote_insumo SET DEFAULT nextval('cenarepas.lote_produccion_insumo_id_lote_insumo_seq'::regclass);


--
-- Name: notificacion id_notificacion; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.notificacion ALTER COLUMN id_notificacion SET DEFAULT nextval('cenarepas.notificacion_id_notificacion_seq'::regclass);


--
-- Name: pedido id_pedido; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.pedido ALTER COLUMN id_pedido SET DEFAULT nextval('cenarepas.pedido_id_pedido_seq'::regclass);


--
-- Name: permiso id_permiso; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.permiso ALTER COLUMN id_permiso SET DEFAULT nextval('cenarepas.permiso_id_permiso_seq'::regclass);


--
-- Name: producto id_producto; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.producto ALTER COLUMN id_producto SET DEFAULT nextval('cenarepas.producto_id_producto_seq'::regclass);


--
-- Name: proveedor id_proveedor; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.proveedor ALTER COLUMN id_proveedor SET DEFAULT nextval('cenarepas.proveedor_id_proveedor_seq'::regclass);


--
-- Name: rol id_rol; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.rol ALTER COLUMN id_rol SET DEFAULT nextval('cenarepas.rol_id_rol_seq'::regclass);


--
-- Name: sede id_sede; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.sede ALTER COLUMN id_sede SET DEFAULT nextval('cenarepas.sede_id_sede_seq'::regclass);


--
-- Name: usuario id_usuario; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.usuario ALTER COLUMN id_usuario SET DEFAULT nextval('cenarepas.usuario_id_usuario_seq'::regclass);


--
-- Name: venta id_venta; Type: DEFAULT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.venta ALTER COLUMN id_venta SET DEFAULT nextval('cenarepas.venta_id_venta_seq'::regclass);


--
-- Name: abono abono_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.abono
    ADD CONSTRAINT abono_pkey PRIMARY KEY (id_abono);


--
-- Name: auditoria auditoria_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id_auditoria);


--
-- Name: categoria_producto categoria_producto_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.categoria_producto
    ADD CONSTRAINT categoria_producto_pkey PRIMARY KEY (id_categoria);


--
-- Name: cliente cliente_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.cliente
    ADD CONSTRAINT cliente_pkey PRIMARY KEY (id_cliente);


--
-- Name: compra compra_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.compra
    ADD CONSTRAINT compra_pkey PRIMARY KEY (id_compra);


--
-- Name: credito credito_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.credito
    ADD CONSTRAINT credito_pkey PRIMARY KEY (id_credito);


--
-- Name: detalle_compra detalle_compra_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.detalle_compra
    ADD CONSTRAINT detalle_compra_pkey PRIMARY KEY (id_detalle_compra);


--
-- Name: detalle_pedido detalle_pedido_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.detalle_pedido
    ADD CONSTRAINT detalle_pedido_pkey PRIMARY KEY (id_detalle_pedido);


--
-- Name: detalle_venta detalle_venta_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.detalle_venta
    ADD CONSTRAINT detalle_venta_pkey PRIMARY KEY (id_detalle_venta);


--
-- Name: ficha_tecnica_insumo ficha_tecnica_insumo_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.ficha_tecnica_insumo
    ADD CONSTRAINT ficha_tecnica_insumo_pkey PRIMARY KEY (id_ficha_insumo);


--
-- Name: ficha_tecnica ficha_tecnica_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.ficha_tecnica
    ADD CONSTRAINT ficha_tecnica_pkey PRIMARY KEY (id_ficha);


--
-- Name: insumo insumo_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.insumo
    ADD CONSTRAINT insumo_pkey PRIMARY KEY (id_insumo);


--
-- Name: lote_produccion_insumo lote_produccion_insumo_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.lote_produccion_insumo
    ADD CONSTRAINT lote_produccion_insumo_pkey PRIMARY KEY (id_lote_insumo);


--
-- Name: lote_produccion lote_produccion_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.lote_produccion
    ADD CONSTRAINT lote_produccion_pkey PRIMARY KEY (id_lote);


--
-- Name: notificacion notificacion_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.notificacion
    ADD CONSTRAINT notificacion_pkey PRIMARY KEY (id_notificacion);


--
-- Name: pedido pedido_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.pedido
    ADD CONSTRAINT pedido_pkey PRIMARY KEY (id_pedido);


--
-- Name: permiso permiso_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.permiso
    ADD CONSTRAINT permiso_pkey PRIMARY KEY (id_permiso);


--
-- Name: producto producto_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.producto
    ADD CONSTRAINT producto_pkey PRIMARY KEY (id_producto);


--
-- Name: proveedor proveedor_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.proveedor
    ADD CONSTRAINT proveedor_pkey PRIMARY KEY (id_proveedor);


--
-- Name: rol_permiso rol_permiso_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.rol_permiso
    ADD CONSTRAINT rol_permiso_pkey PRIMARY KEY (id_rol, id_permiso);


--
-- Name: rol rol_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.rol
    ADD CONSTRAINT rol_pkey PRIMARY KEY (id_rol);


--
-- Name: sede sede_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.sede
    ADD CONSTRAINT sede_pkey PRIMARY KEY (id_sede);


--
-- Name: categoria_producto uq_categoria_nombre; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.categoria_producto
    ADD CONSTRAINT uq_categoria_nombre UNIQUE (nombre);


--
-- Name: cliente uq_cliente_documento; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.cliente
    ADD CONSTRAINT uq_cliente_documento UNIQUE (documento);


--
-- Name: cliente uq_cliente_usuario; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.cliente
    ADD CONSTRAINT uq_cliente_usuario UNIQUE (id_usuario);


--
-- Name: credito uq_credito_pedido; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.credito
    ADD CONSTRAINT uq_credito_pedido UNIQUE (id_pedido);


--
-- Name: detalle_compra uq_detcompra_compra_insumo; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.detalle_compra
    ADD CONSTRAINT uq_detcompra_compra_insumo UNIQUE (id_compra, id_insumo);


--
-- Name: detalle_pedido uq_detpedido_pedido_producto; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.detalle_pedido
    ADD CONSTRAINT uq_detpedido_pedido_producto UNIQUE (id_pedido, id_producto);


--
-- Name: detalle_venta uq_detventa_venta_producto; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.detalle_venta
    ADD CONSTRAINT uq_detventa_venta_producto UNIQUE (id_venta, id_producto);


--
-- Name: ficha_tecnica uq_ficha_nombre; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.ficha_tecnica
    ADD CONSTRAINT uq_ficha_nombre UNIQUE (nombre);


--
-- Name: ficha_tecnica_insumo uq_fichainsumo_ficha_insumo; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.ficha_tecnica_insumo
    ADD CONSTRAINT uq_fichainsumo_ficha_insumo UNIQUE (id_ficha, id_insumo);


--
-- Name: insumo uq_insumo_nombre; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.insumo
    ADD CONSTRAINT uq_insumo_nombre UNIQUE (nombre);


--
-- Name: lote_produccion_insumo uq_loteinsumo_lote_insumo; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.lote_produccion_insumo
    ADD CONSTRAINT uq_loteinsumo_lote_insumo UNIQUE (id_lote, id_insumo);


--
-- Name: permiso uq_permiso_modulo_accion; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.permiso
    ADD CONSTRAINT uq_permiso_modulo_accion UNIQUE (modulo, accion);


--
-- Name: producto uq_producto_nombre; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.producto
    ADD CONSTRAINT uq_producto_nombre UNIQUE (nombre);


--
-- Name: proveedor uq_proveedor_nit; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.proveedor
    ADD CONSTRAINT uq_proveedor_nit UNIQUE (nit);


--
-- Name: rol uq_rol_nombre; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.rol
    ADD CONSTRAINT uq_rol_nombre UNIQUE (nombre);


--
-- Name: sede uq_sede_nombre; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.sede
    ADD CONSTRAINT uq_sede_nombre UNIQUE (nombre);


--
-- Name: usuario uq_usuario_correo; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.usuario
    ADD CONSTRAINT uq_usuario_correo UNIQUE (correo);


--
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario);


--
-- Name: venta venta_pkey; Type: CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.venta
    ADD CONSTRAINT venta_pkey PRIMARY KEY (id_venta);


--
-- Name: idx_abono_credito; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_abono_credito ON cenarepas.abono USING btree (id_credito);


--
-- Name: idx_abono_estado; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_abono_estado ON cenarepas.abono USING btree (estado);


--
-- Name: idx_auditoria_tabla; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_auditoria_tabla ON cenarepas.auditoria USING btree (tabla_afectada, id_registro_afectado);


--
-- Name: idx_auditoria_usuario; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_auditoria_usuario ON cenarepas.auditoria USING btree (id_usuario);


--
-- Name: idx_categoria_nombre; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_categoria_nombre ON cenarepas.categoria_producto USING gin (nombre public.gin_trgm_ops);


--
-- Name: idx_cliente_estado; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_cliente_estado ON cenarepas.cliente USING btree (estado);


--
-- Name: idx_cliente_nombre; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_cliente_nombre ON cenarepas.cliente USING gin (nombre public.gin_trgm_ops);


--
-- Name: idx_compra_estado; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_compra_estado ON cenarepas.compra USING btree (estado);


--
-- Name: idx_compra_fecha; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_compra_fecha ON cenarepas.compra USING btree (fecha_compra);


--
-- Name: idx_compra_proveedor; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_compra_proveedor ON cenarepas.compra USING btree (id_proveedor);


--
-- Name: idx_credito_cliente; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_credito_cliente ON cenarepas.credito USING btree (id_cliente);


--
-- Name: idx_detalle_pedido_pedido; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_detalle_pedido_pedido ON cenarepas.detalle_pedido USING btree (id_pedido);


--
-- Name: idx_detalle_venta_venta; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_detalle_venta_venta ON cenarepas.detalle_venta USING btree (id_venta);


--
-- Name: idx_detpedido_producto; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_detpedido_producto ON cenarepas.detalle_pedido USING btree (id_producto);


--
-- Name: idx_detventa_producto; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_detventa_producto ON cenarepas.detalle_venta USING btree (id_producto);


--
-- Name: idx_ficha_nombre; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_ficha_nombre ON cenarepas.ficha_tecnica USING gin (nombre public.gin_trgm_ops);


--
-- Name: idx_insumo_estado; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_insumo_estado ON cenarepas.insumo USING btree (estado);


--
-- Name: idx_insumo_nombre; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_insumo_nombre ON cenarepas.insumo USING gin (nombre public.gin_trgm_ops);


--
-- Name: idx_insumo_proveedor; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_insumo_proveedor ON cenarepas.insumo USING btree (id_proveedor);


--
-- Name: idx_lote_estado; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_lote_estado ON cenarepas.lote_produccion USING btree (estado);


--
-- Name: idx_lote_fecha; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_lote_fecha ON cenarepas.lote_produccion USING btree (fecha_produccion);


--
-- Name: idx_lote_produccion_ficha; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_lote_produccion_ficha ON cenarepas.lote_produccion USING btree (id_ficha);


--
-- Name: idx_notificacion_usuario; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_notificacion_usuario ON cenarepas.notificacion USING btree (id_usuario, leida, fecha_creacion DESC);


--
-- Name: idx_pedido_cliente; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_pedido_cliente ON cenarepas.pedido USING btree (id_cliente);


--
-- Name: idx_pedido_estado; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_pedido_estado ON cenarepas.pedido USING btree (estado);


--
-- Name: idx_pedido_fecha; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_pedido_fecha ON cenarepas.pedido USING btree (fecha_pedido);


--
-- Name: idx_pedido_sede; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_pedido_sede ON cenarepas.pedido USING btree (id_sede);


--
-- Name: idx_producto_categoria; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_producto_categoria ON cenarepas.producto USING btree (id_categoria);


--
-- Name: idx_producto_estado; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_producto_estado ON cenarepas.producto USING btree (estado);


--
-- Name: idx_producto_ficha; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_producto_ficha ON cenarepas.producto USING btree (id_ficha);


--
-- Name: idx_producto_nombre; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_producto_nombre ON cenarepas.producto USING gin (nombre public.gin_trgm_ops);


--
-- Name: idx_proveedor_estado; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_proveedor_estado ON cenarepas.proveedor USING btree (estado);


--
-- Name: idx_proveedor_nombre; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_proveedor_nombre ON cenarepas.proveedor USING gin (nombre public.gin_trgm_ops);


--
-- Name: idx_usuario_estado; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_usuario_estado ON cenarepas.usuario USING btree (estado);


--
-- Name: idx_usuario_nombre; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_usuario_nombre ON cenarepas.usuario USING gin (nombre public.gin_trgm_ops);


--
-- Name: idx_venta_cliente; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_venta_cliente ON cenarepas.venta USING btree (id_cliente);


--
-- Name: idx_venta_estado; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_venta_estado ON cenarepas.venta USING btree (estado);


--
-- Name: idx_venta_fecha; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_venta_fecha ON cenarepas.venta USING btree (fecha_venta);


--
-- Name: idx_venta_pedido; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_venta_pedido ON cenarepas.venta USING btree (id_pedido);


--
-- Name: idx_venta_sede; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE INDEX idx_venta_sede ON cenarepas.venta USING btree (id_sede);


--
-- Name: ux_cliente_correo_lower; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE UNIQUE INDEX ux_cliente_correo_lower ON cenarepas.cliente USING btree (lower((correo)::text)) WHERE (correo IS NOT NULL);


--
-- Name: ux_usuario_correo_lower; Type: INDEX; Schema: cenarepas; Owner: -
--

CREATE UNIQUE INDEX ux_usuario_correo_lower ON cenarepas.usuario USING btree (lower((correo)::text));


--
-- Name: abono fk_abono_cliente; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.abono
    ADD CONSTRAINT fk_abono_cliente FOREIGN KEY (id_cliente) REFERENCES cenarepas.cliente(id_cliente) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: abono fk_abono_credito; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.abono
    ADD CONSTRAINT fk_abono_credito FOREIGN KEY (id_credito) REFERENCES cenarepas.credito(id_credito) ON DELETE RESTRICT;


--
-- Name: abono fk_abono_pedido; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.abono
    ADD CONSTRAINT fk_abono_pedido FOREIGN KEY (id_pedido) REFERENCES cenarepas.pedido(id_pedido) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: abono fk_abono_usuario_registra; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.abono
    ADD CONSTRAINT fk_abono_usuario_registra FOREIGN KEY (id_usuario_registra) REFERENCES cenarepas.usuario(id_usuario) ON DELETE SET NULL;


--
-- Name: abono fk_abono_usuario_revisa; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.abono
    ADD CONSTRAINT fk_abono_usuario_revisa FOREIGN KEY (id_usuario_revisa) REFERENCES cenarepas.usuario(id_usuario) ON DELETE SET NULL;


--
-- Name: abono fk_abono_venta; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.abono
    ADD CONSTRAINT fk_abono_venta FOREIGN KEY (id_venta) REFERENCES cenarepas.venta(id_venta) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: auditoria fk_auditoria_usuario; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.auditoria
    ADD CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario) REFERENCES cenarepas.usuario(id_usuario) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cliente fk_cliente_usuario; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.cliente
    ADD CONSTRAINT fk_cliente_usuario FOREIGN KEY (id_usuario) REFERENCES cenarepas.usuario(id_usuario) ON DELETE RESTRICT;


--
-- Name: compra fk_compra_proveedor; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.compra
    ADD CONSTRAINT fk_compra_proveedor FOREIGN KEY (id_proveedor) REFERENCES cenarepas.proveedor(id_proveedor) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: compra fk_compra_usuario; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.compra
    ADD CONSTRAINT fk_compra_usuario FOREIGN KEY (id_usuario) REFERENCES cenarepas.usuario(id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: credito fk_credito_cliente; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.credito
    ADD CONSTRAINT fk_credito_cliente FOREIGN KEY (id_cliente) REFERENCES cenarepas.cliente(id_cliente) ON DELETE RESTRICT;


--
-- Name: credito fk_credito_pedido; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.credito
    ADD CONSTRAINT fk_credito_pedido FOREIGN KEY (id_pedido) REFERENCES cenarepas.pedido(id_pedido) ON DELETE RESTRICT;


--
-- Name: detalle_compra fk_detcompra_compra; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.detalle_compra
    ADD CONSTRAINT fk_detcompra_compra FOREIGN KEY (id_compra) REFERENCES cenarepas.compra(id_compra) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: detalle_compra fk_detcompra_insumo; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.detalle_compra
    ADD CONSTRAINT fk_detcompra_insumo FOREIGN KEY (id_insumo) REFERENCES cenarepas.insumo(id_insumo) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalle_pedido fk_detpedido_pedido; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.detalle_pedido
    ADD CONSTRAINT fk_detpedido_pedido FOREIGN KEY (id_pedido) REFERENCES cenarepas.pedido(id_pedido) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: detalle_pedido fk_detpedido_producto; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.detalle_pedido
    ADD CONSTRAINT fk_detpedido_producto FOREIGN KEY (id_producto) REFERENCES cenarepas.producto(id_producto) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalle_venta fk_detventa_producto; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.detalle_venta
    ADD CONSTRAINT fk_detventa_producto FOREIGN KEY (id_producto) REFERENCES cenarepas.producto(id_producto) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: detalle_venta fk_detventa_venta; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.detalle_venta
    ADD CONSTRAINT fk_detventa_venta FOREIGN KEY (id_venta) REFERENCES cenarepas.venta(id_venta) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ficha_tecnica_insumo fk_fichainsumo_ficha; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.ficha_tecnica_insumo
    ADD CONSTRAINT fk_fichainsumo_ficha FOREIGN KEY (id_ficha) REFERENCES cenarepas.ficha_tecnica(id_ficha) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ficha_tecnica_insumo fk_fichainsumo_insumo; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.ficha_tecnica_insumo
    ADD CONSTRAINT fk_fichainsumo_insumo FOREIGN KEY (id_insumo) REFERENCES cenarepas.insumo(id_insumo) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: insumo fk_insumo_proveedor; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.insumo
    ADD CONSTRAINT fk_insumo_proveedor FOREIGN KEY (id_proveedor) REFERENCES cenarepas.proveedor(id_proveedor) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: lote_produccion fk_lote_ficha; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.lote_produccion
    ADD CONSTRAINT fk_lote_ficha FOREIGN KEY (id_ficha) REFERENCES cenarepas.ficha_tecnica(id_ficha) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lote_produccion fk_lote_usuario; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.lote_produccion
    ADD CONSTRAINT fk_lote_usuario FOREIGN KEY (id_usuario_responsable) REFERENCES cenarepas.usuario(id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lote_produccion_insumo fk_loteinsumo_insumo; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.lote_produccion_insumo
    ADD CONSTRAINT fk_loteinsumo_insumo FOREIGN KEY (id_insumo) REFERENCES cenarepas.insumo(id_insumo) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lote_produccion_insumo fk_loteinsumo_lote; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.lote_produccion_insumo
    ADD CONSTRAINT fk_loteinsumo_lote FOREIGN KEY (id_lote) REFERENCES cenarepas.lote_produccion(id_lote) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notificacion fk_notificacion_abono; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.notificacion
    ADD CONSTRAINT fk_notificacion_abono FOREIGN KEY (id_abono) REFERENCES cenarepas.abono(id_abono) ON DELETE SET NULL;


--
-- Name: notificacion fk_notificacion_pedido; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.notificacion
    ADD CONSTRAINT fk_notificacion_pedido FOREIGN KEY (id_pedido) REFERENCES cenarepas.pedido(id_pedido) ON DELETE SET NULL;


--
-- Name: notificacion fk_notificacion_usuario; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.notificacion
    ADD CONSTRAINT fk_notificacion_usuario FOREIGN KEY (id_usuario) REFERENCES cenarepas.usuario(id_usuario) ON DELETE CASCADE;


--
-- Name: pedido fk_pedido_cliente; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.pedido
    ADD CONSTRAINT fk_pedido_cliente FOREIGN KEY (id_cliente) REFERENCES cenarepas.cliente(id_cliente) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pedido fk_pedido_sede; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.pedido
    ADD CONSTRAINT fk_pedido_sede FOREIGN KEY (id_sede) REFERENCES cenarepas.sede(id_sede) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pedido fk_pedido_usuario; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.pedido
    ADD CONSTRAINT fk_pedido_usuario FOREIGN KEY (id_usuario) REFERENCES cenarepas.usuario(id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pedido fk_pedido_venta_origen; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.pedido
    ADD CONSTRAINT fk_pedido_venta_origen FOREIGN KEY (id_venta_origen) REFERENCES cenarepas.venta(id_venta) ON DELETE SET NULL;


--
-- Name: producto fk_producto_categoria; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.producto
    ADD CONSTRAINT fk_producto_categoria FOREIGN KEY (id_categoria) REFERENCES cenarepas.categoria_producto(id_categoria) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: producto fk_producto_ficha; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.producto
    ADD CONSTRAINT fk_producto_ficha FOREIGN KEY (id_ficha) REFERENCES cenarepas.ficha_tecnica(id_ficha) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: producto fk_producto_proveedor; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.producto
    ADD CONSTRAINT fk_producto_proveedor FOREIGN KEY (id_proveedor) REFERENCES cenarepas.proveedor(id_proveedor) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: rol_permiso fk_rolpermiso_permiso; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.rol_permiso
    ADD CONSTRAINT fk_rolpermiso_permiso FOREIGN KEY (id_permiso) REFERENCES cenarepas.permiso(id_permiso) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: rol_permiso fk_rolpermiso_rol; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.rol_permiso
    ADD CONSTRAINT fk_rolpermiso_rol FOREIGN KEY (id_rol) REFERENCES cenarepas.rol(id_rol) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: usuario fk_usuario_rol; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.usuario
    ADD CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES cenarepas.rol(id_rol) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: venta fk_venta_cliente; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.venta
    ADD CONSTRAINT fk_venta_cliente FOREIGN KEY (id_cliente) REFERENCES cenarepas.cliente(id_cliente) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: venta fk_venta_pedido; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.venta
    ADD CONSTRAINT fk_venta_pedido FOREIGN KEY (id_pedido) REFERENCES cenarepas.pedido(id_pedido) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: venta fk_venta_sede; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.venta
    ADD CONSTRAINT fk_venta_sede FOREIGN KEY (id_sede) REFERENCES cenarepas.sede(id_sede) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: venta fk_venta_usuario; Type: FK CONSTRAINT; Schema: cenarepas; Owner: -
--

ALTER TABLE ONLY cenarepas.venta
    ADD CONSTRAINT fk_venta_usuario FOREIGN KEY (id_usuario) REFERENCES cenarepas.usuario(id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--


