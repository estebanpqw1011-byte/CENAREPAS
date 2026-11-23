-- ============================================================================
-- CENAREPAS - Pruebas de las reglas que aplica la base de datos
-- Esquema: cenarepas
--
-- Qué prueba: CHECK de estados y valores, UNIQUE (incluido el correo sin
-- distinguir mayúsculas), llaves foráneas hacia registros inexistentes y lo
-- que la base IMPIDE borrar (ON DELETE RESTRICT y NO ACTION). No hay pruebas
-- que borren pedidos: la regla del proyecto es anular (la aplica el backend).
--
-- Cómo prueba:
--   - Cada prueba corre en una subtransacción que SIEMPRE se deshace, falle o
--     no. Nada queda escrito.
--   - Las que deben fallar comprueban QUÉ restricción falló (CONSTRAINT_NAME),
--     no solo que falló.
--   - Todas las filas de prueba llevan ids explícitos (900001…), así que
--     tampoco avanzan las secuencias.
--   - Al final se comparan las filas de cada tabla y el último valor de cada
--     secuencia antes y después.
--   - Si alguna prueba falla, el script termina con error.
--
-- USO: sobre una base desechable creada con cenarepas_completo.sql y
-- cenarepas_datos_demo.sql (usa sus datos). Se niega a correr en
-- cenarepas_staging y cenarepas_db.
--   psql -U postgres -d cenarepas_verificacion -v ON_ERROR_STOP=1 -f Base_Datos/pruebas_reglas.sql
-- ============================================================================

SET search_path TO cenarepas, public;
SET client_min_messages TO warning;

DO $$
BEGIN
  IF current_database() IN ('cenarepas_staging', 'cenarepas_db') THEN
    RAISE EXCEPTION 'Las pruebas no se ejecutan en "%": usa una base desechable (cenarepas_verificacion).', current_database();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM usuario WHERE correo = 'admin@cenarepas.test')
     OR NOT EXISTS (SELECT 1 FROM pedido WHERE id_pedido = 4) THEN
    RAISE EXCEPTION 'Faltan los datos de demostración: ejecuta antes cenarepas_datos_demo.sql.';
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- Utilidades (temporales: desaparecen al cerrar la sesión)
-- ----------------------------------------------------------------------------

-- Filas por tabla y último valor de cada secuencia del esquema.
CREATE OR REPLACE FUNCTION pg_temp.estado_base()
RETURNS TABLE (objeto text, valor bigint) LANGUAGE plpgsql AS $$
DECLARE t record;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables
           WHERE table_schema = 'cenarepas' AND table_type = 'BASE TABLE' ORDER BY table_name LOOP
    objeto := 'filas de ' || t.table_name;
    EXECUTE format('SELECT count(*) FROM cenarepas.%I', t.table_name) INTO valor;
    RETURN NEXT;
  END LOOP;
  FOR t IN SELECT sequencename, last_value FROM pg_sequences WHERE schemaname = 'cenarepas' ORDER BY sequencename LOOP
    objeto := 'secuencia ' || t.sequencename;
    valor := t.last_value;
    RETURN NEXT;
  END LOOP;
END $$;

DROP TABLE IF EXISTS pg_temp.antes;
CREATE TEMP TABLE antes AS SELECT * FROM pg_temp.estado_base();

DROP TABLE IF EXISTS pg_temp.resultado;
CREATE TEMP TABLE resultado (
  n                 int,
  grupo             text,
  prueba            text,
  esperado          text,
  obtenido          text,
  ok                boolean
);

-- Ejecuta p_sql, que debe fallar por la restricción p_restriccion.
CREATE OR REPLACE FUNCTION pg_temp.debe_fallar(p_grupo text, p_prueba text, p_restriccion text, p_sql text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_estado text; v_restriccion text; v_mensaje text;
BEGIN
  BEGIN
    EXECUTE p_sql;
    RAISE EXCEPTION USING ERRCODE = 'P0999', MESSAGE = 'la operación se permitió';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_estado = RETURNED_SQLSTATE, v_restriccion = CONSTRAINT_NAME, v_mensaje = MESSAGE_TEXT;
  END;
  INSERT INTO pg_temp.resultado VALUES (
    (SELECT count(*) + 1 FROM pg_temp.resultado), p_grupo, p_prueba,
    'falla: ' || p_restriccion,
    CASE WHEN v_estado = 'P0999' THEN 'se permitió (no falló)'
         WHEN v_restriccion IS NULL OR v_restriccion = '' THEN 'falla sin restricción: ' || v_mensaje
         ELSE 'falla: ' || v_restriccion END,
    v_estado <> 'P0999' AND v_restriccion = p_restriccion);
END $$;

-- Ejecuta p_sql, que debe funcionar; después lo deshace.
CREATE OR REPLACE FUNCTION pg_temp.debe_funcionar(p_grupo text, p_prueba text, p_sql text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_estado text; v_restriccion text; v_mensaje text; v_ok boolean;
BEGIN
  BEGIN
    EXECUTE p_sql;
    RAISE EXCEPTION USING ERRCODE = 'P0998', MESSAGE = 'deshacer';
  EXCEPTION
    WHEN SQLSTATE 'P0998' THEN v_ok := true;
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_estado = RETURNED_SQLSTATE, v_restriccion = CONSTRAINT_NAME, v_mensaje = MESSAGE_TEXT;
      v_ok := false;
  END;
  INSERT INTO pg_temp.resultado VALUES (
    (SELECT count(*) + 1 FROM pg_temp.resultado), p_grupo, p_prueba, 'se permite',
    CASE WHEN v_ok THEN 'se permite' ELSE 'falla: ' || COALESCE(NULLIF(v_restriccion, ''), v_mensaje) END,
    v_ok);
END $$;

-- ----------------------------------------------------------------------------
-- Pruebas. Datos del demo que se usan: clientes 1 a 4, sedes 1 y 2, usuarios
-- 1 a 3, productos 1 a 8, insumos 1 a 8, fichas 1 a 3, compras 1 y 2, lotes 1
-- a 3, pedidos 1 a 4 (el 1 y el 2 con crédito y abonos; el 3 y el 4 sin).
-- ----------------------------------------------------------------------------
DO $pruebas$
DECLARE
  -- Pedido de prueba (id 900001), para completar con estado, medio de pago y origen.
  p text := 'INSERT INTO pedido (id_pedido, id_cliente, id_sede, id_usuario, fecha_entrega, valor_total, estado, medio_pago, origen) VALUES ';
BEGIN
  -- 1. Estados y valores permitidos (CHECK)
  PERFORM pg_temp.debe_funcionar('CHECK', 'El pedido admite sus 4 estados: Pendiente, En proceso, Entregado y Anulado',
    p || $$(900001, 1, 1, 3, CURRENT_DATE, 0, 'Pendiente', 'Efectivo', 'personal'),
           (900002, 1, 1, 3, CURRENT_DATE, 0, 'En proceso', 'Efectivo', 'personal'),
           (900003, 1, 1, 3, CURRENT_DATE, 0, 'Entregado', 'Efectivo', 'personal'),
           (900004, 1, 1, 3, CURRENT_DATE, 0, 'Anulado', 'Efectivo', 'personal')$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Estado de pedido fuera de los 4 (Cancelado)', 'ck_pedido_estado',
    p || $$(900001, 1, 1, 3, CURRENT_DATE, 0, 'Cancelado', 'Efectivo', 'personal')$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Medio de pago del pedido no admitido', 'ck_pedido_mediopago',
    p || $$(900001, 1, 1, 3, CURRENT_DATE, 0, 'Pendiente', 'Bitcoin', 'personal')$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Origen del pedido distinto de personal o app', 'ck_pedido_origen',
    p || $$(900001, 1, 1, 3, CURRENT_DATE, 0, 'Pendiente', 'Efectivo', 'whatsapp')$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Total del pedido negativo', 'ck_pedido_total',
    p || $$(900001, 1, 1, 3, CURRENT_DATE, -1, 'Pendiente', 'Efectivo', 'personal')$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Historial con un estado fuera de los 4', 'ck_historial_estado_nuevo',
    $$INSERT INTO pedido_estado_historial (id_historial, id_pedido, estado_anterior, estado_nuevo) VALUES (900001, 4, 'Pendiente', 'Despachado')$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Detalle de pedido con cantidad menor que 1', 'ck_detpedido_cant',
    $$INSERT INTO detalle_pedido (id_detalle_pedido, id_pedido, id_producto, cantidad, precio_unitario, subtotal) VALUES (900001, 4, 1, 0.5, 4500, 2250)$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Detalle de pedido con precio negativo', 'ck_detpedido_precio',
    $$INSERT INTO detalle_pedido (id_detalle_pedido, id_pedido, id_producto, cantidad, precio_unitario, subtotal) VALUES (900001, 4, 1, 1, -100, 0)$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Estado de abono fuera de los 4 (Pagado)', 'ck_abono_estado',
    $$INSERT INTO abono (id_abono, id_cliente, id_pedido, valor_abonado, saldo_pendiente, medio_pago, estado) VALUES (900001, 4, 4, 1000, 0, 'Efectivo', 'Pagado')$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Abono sin pedido ni venta', 'ck_abono_referencia',
    $$INSERT INTO abono (id_abono, id_cliente, valor_abonado, saldo_pendiente, medio_pago) VALUES (900001, 4, 1000, 0, 'Efectivo')$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Abono de 0 pesos', 'ck_abono_valor',
    $$INSERT INTO abono (id_abono, id_cliente, id_pedido, valor_abonado, saldo_pendiente, medio_pago) VALUES (900001, 4, 4, 0, 0, 'Efectivo')$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Crédito con saldo negativo', 'ck_credito_valores',
    $$INSERT INTO credito (id_credito, id_pedido, id_cliente, valor_total, valor_abonado, saldo_pendiente) VALUES (900001, 4, 4, 24000, 30000, -6000)$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Estado de crédito no admitido (Cerrado)', 'ck_credito_estado',
    $$INSERT INTO credito (id_credito, id_pedido, id_cliente, valor_total, valor_abonado, saldo_pendiente, estado) VALUES (900001, 4, 4, 24000, 0, 24000, 'Cerrado')$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Tipo de documento del cliente no admitido', 'ck_cliente_tipodocumento',
    $$INSERT INTO cliente (id_cliente, nombre, documento, tipo_documento) VALUES (900001, 'Prueba', '900001', 'RUT')$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Precio de producto negativo', 'ck_producto_precio',
    $$INSERT INTO producto (id_producto, nombre, id_categoria, precio_venta) VALUES (900001, 'Prueba', 1, -1)$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Stock de producto negativo', 'ck_producto_stock',
    $$INSERT INTO producto (id_producto, nombre, id_categoria, precio_venta, stock_actual) VALUES (900001, 'Prueba', 1, 1000, -1)$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Stock de insumo negativo', 'ck_insumo_stock',
    $$INSERT INTO insumo (id_insumo, nombre, unidad_medida, stock_actual) VALUES (900001, 'Prueba', 'Kg', -5)$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Estado de insumo no admitido (Agotado)', 'ck_insumo_estado',
    $$INSERT INTO insumo (id_insumo, nombre, unidad_medida, estado) VALUES (900001, 'Prueba', 'Kg', 'Agotado')$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Rendimiento de ficha técnica igual a 0', 'ck_ficha_rendimiento',
    $$INSERT INTO ficha_tecnica (id_ficha, nombre, rendimiento_lote) VALUES (900001, 'Prueba', 0)$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Consumo negativo de un insumo en un lote', 'ck_loteinsumo_cant',
    $$INSERT INTO lote_produccion_insumo (id_lote_insumo, id_lote, id_insumo, cantidad_consumida) VALUES (900001, 1, 6, -2)$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Estado de lote no admitido (Cancelado)', 'ck_lote_estado',
    $$INSERT INTO lote_produccion (id_lote, id_ficha, id_usuario_responsable, cantidad_producida, estado) VALUES (900001, 1, 1, 100, 'Cancelado')$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Tipo de notificación no admitido', 'ck_notificacion_tipo',
    $$INSERT INTO notificacion (id_notificacion, id_usuario, tipo, titulo, mensaje) VALUES (900001, 1, 'promocion', 'Prueba', 'Prueba')$$);
  PERFORM pg_temp.debe_fallar('CHECK', 'Intentos de recuperación negativos', 'ck_usuario_recuperacion_intentos',
    $$UPDATE usuario SET recuperacion_intentos = -1 WHERE id_usuario = 3$$);

  -- 2. Valores únicos (UNIQUE)
  PERFORM pg_temp.debe_fallar('UNIQUE', 'Correo de usuario repetido (igual)', 'uq_usuario_correo',
    $$INSERT INTO usuario (id_usuario, nombre, correo, contrasena_hash, id_rol) VALUES (900001, 'Prueba', 'admin@cenarepas.test', 'x', 1)$$);
  PERFORM pg_temp.debe_fallar('UNIQUE', 'Correo de usuario repetido en mayúsculas (ADMIN@CENAREPAS.TEST frente a admin@cenarepas.test)', 'ux_usuario_correo_lower',
    $$INSERT INTO usuario (id_usuario, nombre, correo, contrasena_hash, id_rol) VALUES (900001, 'Prueba', 'ADMIN@CENAREPAS.TEST', 'x', 1)$$);
  PERFORM pg_temp.debe_funcionar('UNIQUE', 'Un correo de usuario distinto sí se permite',
    $$INSERT INTO usuario (id_usuario, nombre, correo, contrasena_hash, id_rol) VALUES (900001, 'Prueba', 'otro@cenarepas.test', 'x', 1)$$);
  PERFORM pg_temp.debe_fallar('UNIQUE', 'Correo de cliente repetido con otras mayúsculas', 'ux_cliente_correo_lower',
    $$INSERT INTO cliente (id_cliente, nombre, documento, correo) VALUES (900001, 'Prueba', '900001', 'Tradicion.Paisa@Example.com')$$);
  PERFORM pg_temp.debe_fallar('UNIQUE', 'Documento de cliente repetido', 'uq_cliente_documento',
    $$INSERT INTO cliente (id_cliente, nombre, documento) VALUES (900001, 'Prueba', '901.888.777-5')$$);
  PERFORM pg_temp.debe_fallar('UNIQUE', 'El mismo producto dos veces en un pedido', 'uq_detpedido_pedido_producto',
    $$INSERT INTO detalle_pedido (id_detalle_pedido, id_pedido, id_producto, cantidad, precio_unitario, subtotal) VALUES (900001, 1, 2, 1, 8500, 8500)$$);
  PERFORM pg_temp.debe_fallar('UNIQUE', 'Un segundo crédito para el mismo pedido', 'uq_credito_pedido',
    $$INSERT INTO credito (id_credito, id_pedido, id_cliente, valor_total, saldo_pendiente) VALUES (900001, 1, 1, 170000, 170000)$$);
  PERFORM pg_temp.debe_fallar('UNIQUE', 'El mismo insumo dos veces en una ficha', 'uq_fichainsumo_ficha_insumo',
    $$INSERT INTO ficha_tecnica_insumo (id_ficha_insumo, id_ficha, id_insumo, cantidad, unidad_medida) VALUES (900001, 1, 1, 1, 'Kg')$$);
  PERFORM pg_temp.debe_fallar('UNIQUE', 'Nombre de producto repetido', 'uq_producto_nombre',
    $$INSERT INTO producto (id_producto, nombre, id_categoria, precio_venta) VALUES (900001, 'Arepa Amarilla Tela x5', 1, 1000)$$);
  PERFORM pg_temp.debe_fallar('UNIQUE', 'Permiso repetido (módulo y acción)', 'uq_permiso_modulo_accion',
    $$INSERT INTO permiso (id_permiso, modulo, accion) VALUES (900001, 'pedidos', 'ver')$$);

  -- 3. Referencias a registros que no existen (FOREIGN KEY)
  PERFORM pg_temp.debe_fallar('FOREIGN KEY', 'Pedido de un cliente que no existe', 'fk_pedido_cliente',
    p || $$(900001, 999999, 1, 3, CURRENT_DATE, 0, 'Pendiente', 'Efectivo', 'personal')$$);
  PERFORM pg_temp.debe_fallar('FOREIGN KEY', 'Abono a un crédito que no existe', 'fk_abono_credito',
    $$INSERT INTO abono (id_abono, id_cliente, id_pedido, id_credito, valor_abonado, saldo_pendiente, medio_pago) VALUES (900001, 1, 1, 999999, 1000, 0, 'Efectivo')$$);

  -- 4. Lo que la base impide borrar (ON DELETE RESTRICT y NO ACTION).
  --    Cuando el registro del demo tiene varias referencias, se arma un caso
  --    aislado con ids 900001 para que falle una sola llave.
  PERFORM pg_temp.debe_fallar('NO SE BORRA', 'Cliente con pedidos (cliente 2, pedido 3)', 'fk_pedido_cliente',
    $$DELETE FROM cliente WHERE id_cliente = 2$$);
  PERFORM pg_temp.debe_fallar('NO SE BORRA', 'Producto usado en un pedido (producto 1, pedido 3)', 'fk_detpedido_producto',
    $$DELETE FROM producto WHERE id_producto = 1$$);
  PERFORM pg_temp.debe_fallar('NO SE BORRA', 'Insumo usado en una ficha técnica', 'fk_fichainsumo_insumo',
    $$INSERT INTO insumo (id_insumo, nombre, unidad_medida) VALUES (900001, 'Prueba', 'Kg');
      INSERT INTO ficha_tecnica_insumo (id_ficha_insumo, id_ficha, id_insumo, cantidad, unidad_medida) VALUES (900001, 1, 900001, 1, 'Kg');
      DELETE FROM insumo WHERE id_insumo = 900001$$);
  PERFORM pg_temp.debe_fallar('NO SE BORRA', 'Insumo usado en una compra', 'fk_detcompra_insumo',
    $$INSERT INTO insumo (id_insumo, nombre, unidad_medida) VALUES (900001, 'Prueba', 'Kg');
      INSERT INTO detalle_compra (id_detalle_compra, id_compra, id_insumo, cantidad, valor_unitario, subtotal) VALUES (900001, 1, 900001, 1, 1, 1);
      DELETE FROM insumo WHERE id_insumo = 900001$$);
  PERFORM pg_temp.debe_fallar('NO SE BORRA', 'Insumo consumido en un lote', 'fk_loteinsumo_insumo',
    $$INSERT INTO insumo (id_insumo, nombre, unidad_medida) VALUES (900001, 'Prueba', 'Kg');
      INSERT INTO lote_produccion_insumo (id_lote_insumo, id_lote, id_insumo, cantidad_consumida) VALUES (900001, 1, 900001, 1);
      DELETE FROM insumo WHERE id_insumo = 900001$$);
  PERFORM pg_temp.debe_fallar('NO SE BORRA', 'Categoría con productos (categoría 3)', 'fk_producto_categoria',
    $$DELETE FROM categoria_producto WHERE id_categoria = 3$$);
  PERFORM pg_temp.debe_fallar('NO SE BORRA', 'Ficha técnica con lotes de producción', 'fk_lote_ficha',
    $$INSERT INTO ficha_tecnica (id_ficha, nombre) VALUES (900001, 'Prueba');
      INSERT INTO lote_produccion (id_lote, id_ficha, id_usuario_responsable, cantidad_producida) VALUES (900001, 900001, 1, 10);
      DELETE FROM ficha_tecnica WHERE id_ficha = 900001$$);
  PERFORM pg_temp.debe_fallar('NO SE BORRA', 'Proveedor con compras', 'fk_compra_proveedor',
    $$INSERT INTO proveedor (id_proveedor, nombre, nit) VALUES (900001, 'Prueba', '900001');
      INSERT INTO compra (id_compra, id_proveedor, id_usuario, medio_pago) VALUES (900001, 900001, 2, 'Efectivo');
      DELETE FROM proveedor WHERE id_proveedor = 900001$$);
  PERFORM pg_temp.debe_fallar('NO SE BORRA', 'Sede con pedidos (sede 1, pedido 3)', 'fk_pedido_sede',
    $$DELETE FROM sede WHERE id_sede = 1$$);
  PERFORM pg_temp.debe_fallar('NO SE BORRA', 'Rol con usuarios (Vendedor)', 'fk_usuario_rol',
    $$DELETE FROM rol WHERE id_rol = 3$$);
  PERFORM pg_temp.debe_fallar('NO SE BORRA', 'Usuario que registró pedidos', 'fk_pedido_usuario',
    $$INSERT INTO usuario (id_usuario, nombre, correo, contrasena_hash, id_rol) VALUES (900001, 'Prueba', 'prueba.900001@cenarepas.test', 'x', 3);
      INSERT INTO pedido (id_pedido, id_cliente, id_sede, id_usuario, fecha_entrega, valor_total, estado, medio_pago, origen)
      VALUES (900001, 1, 1, 900001, CURRENT_DATE, 0, 'Pendiente', 'Efectivo', 'personal');
      DELETE FROM usuario WHERE id_usuario = 900001$$);
  PERFORM pg_temp.debe_fallar('NO SE BORRA', 'Usuario que es la cuenta de un cliente', 'fk_cliente_usuario',
    $$INSERT INTO usuario (id_usuario, nombre, correo, contrasena_hash, id_rol) VALUES (900001, 'Prueba', 'prueba.900001@cenarepas.test', 'x', 5);
      INSERT INTO cliente (id_cliente, nombre, documento, id_usuario) VALUES (900001, 'Prueba', '900001', 900001);
      DELETE FROM usuario WHERE id_usuario = 900001$$);
  PERFORM pg_temp.debe_fallar('NO SE BORRA', 'Crédito con abonos (crédito 2)', 'fk_abono_credito',
    $$DELETE FROM credito WHERE id_credito = 2$$);
  PERFORM pg_temp.debe_fallar('NO SE BORRA', 'Pedido con crédito', 'fk_credito_pedido',
    p || $$(900001, 1, 1, 3, CURRENT_DATE, 1000, 'Pendiente', 'Efectivo', 'personal');
      INSERT INTO credito (id_credito, id_pedido, id_cliente, valor_total, saldo_pendiente) VALUES (900001, 900001, 1, 1000, 1000);
      DELETE FROM pedido WHERE id_pedido = 900001$$);
  PERFORM pg_temp.debe_fallar('NO SE BORRA', 'Pedido con historial de estados (pedido 4)', 'pedido_estado_historial_id_pedido_fkey',
    $$DELETE FROM pedido WHERE id_pedido = 4$$);
END
$pruebas$;

-- ----------------------------------------------------------------------------
-- Resultados
-- ----------------------------------------------------------------------------
SELECT n AS "#", grupo, prueba, esperado, obtenido, CASE WHEN ok THEN 'OK' ELSE 'FALLA' END AS resultado
FROM pg_temp.resultado ORDER BY n;

SELECT count(*) AS pruebas,
       count(*) FILTER (WHERE ok) AS pasaron,
       count(*) FILTER (WHERE NOT ok) AS fallaron
FROM pg_temp.resultado;

-- La base quedó igual: filas por tabla y último valor de cada secuencia.
DROP TABLE IF EXISTS pg_temp.despues;
CREATE TEMP TABLE despues AS SELECT * FROM pg_temp.estado_base();

SELECT a.objeto, a.valor AS antes, d.valor AS despues,
       CASE WHEN a.valor IS NOT DISTINCT FROM d.valor THEN 'igual' ELSE 'CAMBIÓ' END AS comparacion
FROM pg_temp.antes a FULL JOIN pg_temp.despues d USING (objeto)
ORDER BY a.objeto;

SET client_min_messages TO notice;
DO $$
DECLARE v_fallas int; v_cambios int;
BEGIN
  SELECT count(*) INTO v_fallas FROM pg_temp.resultado WHERE NOT ok;
  SELECT count(*) INTO v_cambios
  FROM pg_temp.antes a FULL JOIN pg_temp.despues d USING (objeto)
  WHERE a.valor IS DISTINCT FROM d.valor;
  IF v_fallas > 0 OR v_cambios > 0 THEN
    RAISE EXCEPTION 'Pruebas de reglas: % prueba(s) fallaron y % tabla(s) o secuencia(s) cambiaron.', v_fallas, v_cambios;
  END IF;
  RAISE NOTICE 'Pruebas de reglas: todas pasaron y la base quedó igual.';
END
$$;
