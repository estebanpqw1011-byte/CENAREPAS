-- ============================================================================
-- CENAREPAS - Datos de demostración (Masarepas)
-- Versión: 3.0 (lo que el backend habría guardado, paso a paso)
-- Esquema: cenarepas
--
-- ADVERTENCIA: solo para demostraciones y bases desechables. Todos los usuarios
-- del personal tienen la contraseña Cenarepas2026* (hash bcrypt de 10 rondas,
-- como lo genera el backend). Nunca en producción.
--
-- USO (después de cenarepas_completo.sql, sobre la misma base nueva):
--   psql -U postgres -d <base> -v ON_ERROR_STOP=1 -f Base_Datos/cenarepas_datos_demo.sql
--
-- PROTECCIÓN: corre en una sola transacción y se niega a ejecutarse si la base
-- tiene usuarios que no son los del demo (Staging, cenarepas_db o cualquier
-- base en uso). Se puede ejecutar dos veces: la segunda no duplica ni cambia
-- nada (ON CONFLICT DO NOTHING y NOT EXISTS en el historial).
--
-- CRITERIO: cada fila es la que el backend guarda al hacer la operación
-- descrita en su comentario (services/*.service.js), aunque el backend esté
-- incompleto. En particular:
--   - Pedido del personal: nace Pendiente, con una fila de historial en la
--     misma transacción (misma fecha que fecha_pedido y motivo NULL). Guarda
--     direccion_entrega, pero no municipio_entrega ni barrio_entrega.
--   - Cambio de estado: una fila de historial; el motivo solo se guarda al
--     anular. Entregar pone fecha_entregado = la fecha de su fila del
--     historial, stock_descontado = TRUE y descuenta el stock de los productos.
--   - Abono del personal: queda Aprobado, con id_usuario_revisa = quien lo
--     registra y fecha_revision = fecha_registro. El crédito se crea en esa
--     misma transacción (fecha_creacion = fecha_registro del primer abono). Un
--     pedido sin abonos no tiene crédito. La transferencia exige comprobante.
--   - Stock de insumos: el backend NO lo mueve con las compras ni con los
--     lotes (pendiente del equipo, ver HANDOFF.md). Aquí es el valor con el
--     que se registró cada insumo; no simula compras ni consumos.
--   - Lote de producción: los consumos se guardan al crear el lote (también
--     el que sigue En proceso), con las cantidades que envía la pantalla.
--   - Clientes registrados por el personal: sin usuario (id_usuario NULL), así
--     que no hay notificaciones. El backend no escribe en auditoria.
--
-- Fechas relativas a la hora de ejecución: todo corre en una transacción, así
-- que CURRENT_TIMESTAMP es el mismo en todo el script y las fechas que deben
-- coincidir coinciden exactamente.
--
-- Dominios reservados (RFC 2606): @cenarepas.test para el personal y
-- @example.com para clientes y proveedores. Imágenes en NULL.
-- ============================================================================

BEGIN;

SET search_path TO cenarepas, public;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM usuario
    WHERE LOWER(correo) NOT IN ('admin@cenarepas.test', 'secretaria@cenarepas.test', 'vendedor@cenarepas.test')
  ) THEN
    RAISE EXCEPTION 'La base "%" tiene usuarios que no son del demo: estos datos solo van en una base nueva creada con cenarepas_completo.sql. No se cambió nada.', current_database();
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 1. SEDES (sedes.service: create)
-- ----------------------------------------------------------------------------
INSERT INTO sede (id_sede, nombre, direccion, telefono, horario_atencion, responsable, estado) VALUES
(1, 'Bello Oriente', 'Calle 56 # 22-10, Barrio Bello Oriente, Medellín', '6042113344', 'Lunes a Sábado 5:30 AM - 4:00 PM', 'María Quintero Figueroa', 'Activo'),
(2, 'Aranjuez', 'Carrera 52 # 91-30, Barrio Aranjuez, Medellín', '6042125566', 'Lunes a Domingo 6:00 AM - 6:00 PM', 'Laura Gómez Morales', 'Activo')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. USUARIOS DEL PERSONAL (usuarios.service: create). Hace 30 días.
-- ----------------------------------------------------------------------------
INSERT INTO usuario (id_usuario, nombre, correo, contrasena_hash, id_rol, estado, fecha_creacion) VALUES
(1, 'María Quintero Figueroa', 'admin@cenarepas.test', '$2b$10$YQO6iCO5RFUcF/emxnDxL.YxPG1N6v1yFytqWGldTTKOmcDXiCnKe', 1, 'Activo', CURRENT_TIMESTAMP - INTERVAL '30 day'),
(2, 'Laura Gómez Morales', 'secretaria@cenarepas.test', '$2b$10$YQO6iCO5RFUcF/emxnDxL.YxPG1N6v1yFytqWGldTTKOmcDXiCnKe', 2, 'Activo', CURRENT_TIMESTAMP - INTERVAL '30 day'),
(3, 'Carlos Ruiz Henao', 'vendedor@cenarepas.test', '$2b$10$YQO6iCO5RFUcF/emxnDxL.YxPG1N6v1yFytqWGldTTKOmcDXiCnKe', 3, 'Activo', CURRENT_TIMESTAMP - INTERVAL '30 day')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. PROVEEDORES (proveedores.service: create). Hace 30 días.
-- ----------------------------------------------------------------------------
INSERT INTO proveedor (id_proveedor, nombre, nit, telefono, correo, direccion, estado, fecha_creacion) VALUES
(1, 'Harinera del Sol SAS', '900.123.456-1', '6043110022', 'harinera.sol@example.com', 'Zona Industrial Belén, Medellín', 'Activo', CURRENT_TIMESTAMP - INTERVAL '30 day'),
(2, 'Distribuidora Agrícola de Antioquia', '900.234.567-2', '6043120033', 'agricola.antioquia@example.com', 'Central Mayorista de Antioquia, Bloque 12, Itagüí', 'Activo', CURRENT_TIMESTAMP - INTERVAL '30 day'),
(3, 'Empaques e Insumos Industriales de Medellín', '900.345.678-3', '6043130044', 'empaques.medellin@example.com', 'Carrera 65 # 32-15, Medellín', 'Activo', CURRENT_TIMESTAMP - INTERVAL '30 day')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. INSUMOS (insumos.service: create)
-- stock_actual es el valor con el que se registró el insumo: el backend no lo
-- cambia con las compras (sección 9) ni con los lotes (sección 10).
-- ----------------------------------------------------------------------------
INSERT INTO insumo (id_insumo, nombre, unidad_medida, stock_actual, stock_minimo, fecha_vencimiento, id_proveedor, estado) VALUES
(1, 'Harina de Maíz Amarillo Precocida', 'Kg', 350.00, 100.00, '2027-03-31', 1, 'Activo'),
(2, 'Harina de Maíz Blanco Precocida', 'Kg', 250.00, 100.00, '2027-03-31', 1, 'Activo'),
(3, 'Maíz Chócolo Tierno Desgranado', 'Kg', 150.00, 60.00, '2026-11-30', 2, 'Activo'),
(4, 'Sal Marina Refinada', 'Kg', 120.00, 25.00, '2027-12-31', 1, 'Activo'),
(5, 'Agua Purificada de Proceso', 'Litro', 1000.00, 200.00, NULL, NULL, 'Activo'),
(6, 'Bolsas Termoencogibles Tela x100 und', 'Paquete', 250.00, 50.00, NULL, 3, 'Activo'),
(7, 'Bolsas Termoencogibles Media Tela x100 und', 'Paquete', 250.00, 50.00, NULL, 3, 'Activo'),
(8, 'Bolsas Termoencogibles Extragrande x100 und', 'Paquete', 180.00, 35.00, NULL, 3, 'Activo')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. CATEGORÍAS (categorias.service: create). imagen_url en NULL.
-- ----------------------------------------------------------------------------
INSERT INTO categoria_producto (id_categoria, nombre, descripcion, estado, imagen_url) VALUES
(1, 'Arepas de Maíz Amarillo', 'Arepas artesanales de puro maíz amarillo precocido en sus tres presentaciones tradicionales', 'Activo', NULL),
(2, 'Arepas de Maíz Blanco', 'Arepas clásicas de puro maíz blanco seleccionadas de suave textura tradicional', 'Activo', NULL),
(3, 'Arepas de Chócolo', 'Arepas dulces de maíz tierno choclo tradicional sin aditivos artificiales', 'Activo', NULL)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. FICHAS TÉCNICAS Y SUS INSUMOS (fichasTecnicas.service: create)
-- ----------------------------------------------------------------------------
INSERT INTO ficha_tecnica (id_ficha, nombre, descripcion, instrucciones_preparacion, tiempo_estimado_minutos, rendimiento_lote, estado) VALUES
(1, 'Ficha: Arepa Amarilla Tradicional', 'Fórmula estándar para lote de 100 arepas amarillas (tela, media tela y extragrande)', '1. Verter harina de maíz amarillo precocida en batea de amasado. 2. Añadir agua purificada tibia y sal marina refinada. 3. Amasar mecánicamente durante 10 minutos hasta masa suave y elástica. 4. Reposar 5 minutos. 5. Porcionar y laminar según espesor de presentación. 6. Asar en plancha a 180°C.', 40, 100.00, 'Activo'),
(2, 'Ficha: Arepa Blanca Tradicional', 'Fórmula estándar para lote de 100 arepas blancas de tela tradicional', '1. Hidratar harina de maíz blanco con agua purificada y sal refinada. 2. Amasar durante 10 minutos continuos hasta homogeneidad completa. 3. Reposar 5 minutos bajo cubierta húmeda. 4. Laminar a grosor tela tradicional. 5. Troquelar en discos de 13 cm. 6. Asar en plancha continua a temperatura media.', 40, 100.00, 'Activo'),
(3, 'Ficha: Arepa de Chócolo Tradicional', 'Fórmula artesanal para lote de 80 arepas de maíz tierno dulce', '1. Moler grano de maíz chócolo tierno fresco. 2. Incorporar pizca de sal marina y agua purificada si se requiere ajuste de fluidez. 3. Mezclar hasta obtener pasta homogénea. 4. Dosificar en plancha antiadherente precalentada a 160°C. 5. Dorar 4 minutos por cada cara hasta alcanzar color acaramelado natural.', 50, 80.00, 'Activo')
ON CONFLICT DO NOTHING;

INSERT INTO ficha_tecnica_insumo (id_ficha_insumo, id_ficha, id_insumo, cantidad, unidad_medida) VALUES
(1, 1, 1, 10.00, 'Kg'),    -- Harina amarilla: 10 Kg por 100 und
(2, 1, 5, 12.00, 'Litro'), -- Agua: 12 L por 100 und
(3, 1, 4, 0.20, 'Kg'),     -- Sal: 0.20 Kg por 100 und
(4, 2, 2, 10.00, 'Kg'),    -- Harina blanca: 10 Kg por 100 und
(5, 2, 5, 12.00, 'Litro'), -- Agua: 12 L por 100 und
(6, 2, 4, 0.20, 'Kg'),     -- Sal: 0.20 Kg por 100 und
(7, 3, 3, 15.00, 'Kg'),    -- Maíz chócolo: 15 Kg por 80 und
(8, 3, 5, 2.00, 'Litro'),  -- Agua: 2 L por 80 und
(9, 3, 4, 0.15, 'Kg')      -- Sal: 0.15 Kg por 80 und
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. PRODUCTOS (productos.service: create). imagen_url en NULL.
-- 3 presentaciones de amarilla (tela, media tela, extragrande), blanca y chócolo.
-- stock_actual es el de hoy: el registrado menos lo que descontaron las
-- entregas de los pedidos 1 y 2 (productos 2, 4, 5 y 7: 10 unidades cada uno).
-- Los lotes no suman stock de productos en el backend.
-- ----------------------------------------------------------------------------
INSERT INTO producto (id_producto, nombre, descripcion, id_categoria, id_ficha, id_proveedor, precio_venta, imagen_url, stock_actual, stock_minimo, fecha_vencimiento, estado) VALUES
(1, 'Arepa Amarilla Tela x5', 'Paquete de 5 arepas amarillas delgadas de maíz tradicional para asar', 1, 1, 1, 4500.00, NULL, 160.00, 30.00, '2026-11-15', 'Activo'),
(2, 'Arepa Amarilla Tela x10', 'Paquete familiar de 10 arepas amarillas delgadas de maíz tradicional', 1, 1, 1, 8500.00, NULL, 180.00, 40.00, '2026-11-15', 'Activo'),         -- registrado con 190
(3, 'Arepa Amarilla Media Tela x5', 'Paquete de 5 arepas amarillas de grosor intermedio, suaves y consistentes', 1, 1, 1, 4500.00, NULL, 140.00, 25.00, '2026-11-15', 'Activo'),
(4, 'Arepa Amarilla Media Tela x10', 'Paquete familiar de 10 arepas amarillas de grosor intermedio', 1, 1, 1, 8500.00, NULL, 150.00, 35.00, '2026-11-15', 'Activo'),          -- registrado con 160
(5, 'Arepa Amarilla Extragrande x5', 'Paquete de 5 arepas amarillas de diámetro especial (18 cm) para asadero y restaurante', 1, 1, 1, 6500.00, NULL, 95.00, 20.00, '2026-11-15', 'Activo'), -- registrado con 105
(6, 'Arepa Blanca Tradicional x5', 'Paquete de 5 arepas blancas tradicionales de puro maíz blanco sin conservantes', 2, 2, 1, 4500.00, NULL, 150.00, 30.00, '2026-11-20', 'Activo'),
(7, 'Arepa Blanca Tradicional x10', 'Paquete familiar de 10 arepas blancas tradicionales de puro maíz blanco', 2, 2, 1, 8500.00, NULL, 160.00, 35.00, '2026-11-20', 'Activo'),      -- registrado con 170
(8, 'Arepa de Chócolo Tradicional x5', 'Paquete de 5 arepas artesanales de maíz tierno dulce asadas a la plancha', 3, 3, 2, 7500.00, NULL, 110.00, 25.00, '2026-11-10', 'Activo')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8. CLIENTES registrados por el personal (clientes.service: create). Hace 30 días.
-- ----------------------------------------------------------------------------
INSERT INTO cliente (id_cliente, nombre, tipo_documento, documento, telefono, correo, direccion, municipio, barrio, estado, id_usuario, fecha_creacion) VALUES
(1, 'Restaurante Tradición Paisa SAS', 'NIT', '901.888.777-5', '3001234567', 'tradicion.paisa@example.com', 'Carrera 52 # 91-10', 'Medellín', 'Aranjuez', 'Activo', NULL, CURRENT_TIMESTAMP - INTERVAL '30 day'),
(2, 'Tienda y Cafetería Doña Rosa', 'CC', '43567890', '3128901234', 'tienda.donarosa@example.com', 'Calle 56B # 23-12', 'Medellín', 'Bello Oriente', 'Activo', NULL, CURRENT_TIMESTAMP - INTERVAL '30 day'),
(3, 'Supermercado El Vecino Aranjuez', 'NIT', '900.555.444-1', '3184561230', 'compras.elvecino@example.com', 'Carrera 49 # 93-20', 'Medellín', 'Aranjuez', 'Activo', NULL, CURRENT_TIMESTAMP - INTERVAL '30 day'),
(4, 'María Fernanda López', 'CC', '1037654321', '3206549870', 'mafe.lopez@example.com', 'Calle 92 # 51A-24, Apt 301', 'Medellín', 'Aranjuez', 'Activo', NULL, CURRENT_TIMESTAMP - INTERVAL '30 day')
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 9. COMPRAS (compras.service: create), registradas por la Secretaria.
-- No cambian el stock de los insumos (el backend no lo hace).
-- ----------------------------------------------------------------------------
INSERT INTO compra (id_compra, id_proveedor, id_usuario, fecha_compra, valor_total, medio_pago, estado, fecha_registro) VALUES
(1, 1, 2, CURRENT_DATE - 5, 1350000.00, 'Transferencia', 'Registrada', CURRENT_TIMESTAMP - INTERVAL '5 day'),
(2, 2, 2, CURRENT_DATE - 3, 675000.00, 'Transferencia', 'Registrada', CURRENT_TIMESTAMP - INTERVAL '3 day')
ON CONFLICT DO NOTHING;

INSERT INTO detalle_compra (id_detalle_compra, id_compra, id_insumo, cantidad, valor_unitario, subtotal) VALUES
(1, 1, 1, 250.00, 2700.00, 675000.00), -- Harina amarilla
(2, 1, 2, 250.00, 2700.00, 675000.00), -- Harina blanca
(3, 2, 3, 150.00, 4500.00, 675000.00)  -- Maíz chócolo
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 10. LOTES DE PRODUCCIÓN (produccion.service: create y update)
-- Consumo = cantidad de la ficha x cantidad producida / rendimiento del lote.
-- No descuentan el stock de los insumos (el backend no lo hace).
-- ----------------------------------------------------------------------------
INSERT INTO lote_produccion (id_lote, id_ficha, id_usuario_responsable, fecha_produccion, cantidad_producida, estado, observaciones) VALUES
(1, 1, 1, CURRENT_DATE - 2, 250.00, 'Terminado', 'Producción matutina arepas amarillas en Sede Bello Oriente'),
(2, 2, 1, CURRENT_DATE - 1, 200.00, 'Terminado', 'Producción arepas blancas estándar de calidad óptimo'),
(3, 3, 1, CURRENT_DATE, 80.00, 'En proceso', 'Lote de arepas de chócolo en preparación y asado para distribución')
ON CONFLICT DO NOTHING;

INSERT INTO lote_produccion_insumo (id_lote_insumo, id_lote, id_insumo, cantidad_consumida) VALUES
(1, 1, 1, 25.00), -- Lote 1 (250 und, ficha 1 de 100): harina amarilla 10 x 2.5
(2, 1, 5, 30.00), --                                     agua 12 x 2.5
(3, 1, 4, 0.50),  --                                     sal 0.20 x 2.5
(4, 2, 2, 20.00), -- Lote 2 (200 und, ficha 2 de 100): harina blanca 10 x 2
(5, 2, 5, 24.00), --                                     agua 12 x 2
(6, 2, 4, 0.40),  --                                     sal 0.20 x 2
(7, 3, 3, 15.00), -- Lote 3 (80 und, ficha 3 de 80):   chócolo 15 x 1
(8, 3, 5, 2.00),  --                                     agua 2 x 1
(9, 3, 4, 0.15)   --                                     sal 0.15 x 1
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 11. PEDIDOS (pedidos.service: crearPorPersonal y cambiarEstado),
--     CRÉDITOS Y ABONOS (creditos.service: registrarPorPersonal)
-- Todos con origen 'personal'. Historial: motivo NULL (nadie anuló).
-- ----------------------------------------------------------------------------

-- Pedido 1 (Restaurante Tradición Paisa, Aranjuez): lo crea el Vendedor hace 3
-- días; la Secretaria lo pasa a En proceso; el Vendedor lo entrega hace 2 días
-- y 30 minutos después registra un abono por el total, por transferencia con
-- comprobante: el crédito nace con ese abono y queda Pagado.
-- 10 x Amarilla Tela x10 ($85.000) + 10 x Blanca Tradicional x10 ($85.000) = $170.000
INSERT INTO pedido (id_pedido, id_cliente, id_sede, id_usuario, fecha_pedido, fecha_entrega, valor_total, estado, observaciones, medio_pago, origen, fecha_entregado, stock_descontado) VALUES
(1, 1, 2, 3, CURRENT_TIMESTAMP - INTERVAL '3 day', CURRENT_DATE - 2, 170000.00, 'Entregado', 'Despacho institucional para almuerzos en Aranjuez', 'Transferencia', 'personal', CURRENT_TIMESTAMP - INTERVAL '2 day', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO detalle_pedido (id_detalle_pedido, id_pedido, id_producto, cantidad, precio_unitario, subtotal) VALUES
(1, 1, 2, 10.00, 8500.00, 85000.00),
(2, 1, 7, 10.00, 8500.00, 85000.00)
ON CONFLICT DO NOTHING;

INSERT INTO credito (id_credito, id_pedido, id_cliente, valor_total, valor_abonado, saldo_pendiente, estado, fecha_creacion) VALUES
(1, 1, 1, 170000.00, 170000.00, 0.00, 'Pagado', CURRENT_TIMESTAMP - INTERVAL '2 day' + INTERVAL '30 minute')
ON CONFLICT DO NOTHING;

-- Comprobante con el nombre que genera la subida (u<id usuario>_<milisegundos>_<24 hex>).
-- El archivo no existe en Backend/comprobantes: al abrirlo, el backend responde 404.
INSERT INTO abono (id_abono, id_cliente, id_pedido, id_credito, fecha_abono, valor_abonado, saldo_pendiente, medio_pago, comprobante_url, estado, fecha_registro, id_usuario_registra, id_usuario_revisa, fecha_revision) VALUES
(1, 1, 1, 1, (CURRENT_TIMESTAMP - INTERVAL '2 day' + INTERVAL '30 minute')::date, 170000.00, 0.00, 'Transferencia',
 '/api/v1/comprobantes/u3_' || (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP - INTERVAL '2 day' + INTERVAL '25 minute') * 1000)::bigint || '_000000000000000000000001.pdf',
 'Aprobado', CURRENT_TIMESTAMP - INTERVAL '2 day' + INTERVAL '30 minute', 3, 3, CURRENT_TIMESTAMP - INTERVAL '2 day' + INTERVAL '30 minute')
ON CONFLICT DO NOTHING;

-- Pedido 2 (Supermercado El Vecino, Aranjuez): creado hace 2 días y entregado
-- hace 1; al entregarlo el Vendedor registra un abono del 50% en efectivo.
-- 10 x Amarilla Media Tela x10 ($85.000) + 10 x Amarilla Extragrande x5 ($65.000) = $150.000
INSERT INTO pedido (id_pedido, id_cliente, id_sede, id_usuario, fecha_pedido, fecha_entrega, valor_total, estado, observaciones, medio_pago, origen, fecha_entregado, stock_descontado) VALUES
(2, 3, 2, 3, CURRENT_TIMESTAMP - INTERVAL '2 day', CURRENT_DATE - 1, 150000.00, 'Entregado', 'Pedido semanal para exhibidor refrigerado', 'Efectivo', 'personal', CURRENT_TIMESTAMP - INTERVAL '1 day', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO detalle_pedido (id_detalle_pedido, id_pedido, id_producto, cantidad, precio_unitario, subtotal) VALUES
(3, 2, 4, 10.00, 8500.00, 85000.00),
(4, 2, 5, 10.00, 6500.00, 65000.00)
ON CONFLICT DO NOTHING;

INSERT INTO credito (id_credito, id_pedido, id_cliente, valor_total, valor_abonado, saldo_pendiente, estado, fecha_creacion) VALUES
(2, 2, 3, 150000.00, 75000.00, 75000.00, 'Activo', CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '10 minute')
ON CONFLICT DO NOTHING;

INSERT INTO abono (id_abono, id_cliente, id_pedido, id_credito, fecha_abono, valor_abonado, saldo_pendiente, medio_pago, comprobante_url, estado, fecha_registro, id_usuario_registra, id_usuario_revisa, fecha_revision) VALUES
(2, 3, 2, 2, (CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '10 minute')::date, 75000.00, 75000.00, 'Efectivo', NULL,
 'Aprobado', CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '10 minute', 3, 3, CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '10 minute')
ON CONFLICT DO NOTHING;

-- Pedido 3 (Tienda Doña Rosa, Bello Oriente): creado hace 4 horas y En proceso
-- desde hace 2. Sin abonos, así que sin crédito.
-- 10 x Amarilla Tela x5 ($45.000) + 4 x Chócolo Tradicional x5 ($30.000) = $75.000
INSERT INTO pedido (id_pedido, id_cliente, id_sede, id_usuario, fecha_pedido, fecha_entrega, valor_total, estado, observaciones, medio_pago, origen) VALUES
(3, 2, 1, 3, CURRENT_TIMESTAMP - INTERVAL '4 hour', CURRENT_DATE, 75000.00, 'En proceso', 'Entrega vespertina en Bello Oriente', 'Efectivo', 'personal')
ON CONFLICT DO NOTHING;

INSERT INTO detalle_pedido (id_detalle_pedido, id_pedido, id_producto, cantidad, precio_unitario, subtotal) VALUES
(5, 3, 1, 10.00, 4500.00, 45000.00),
(6, 3, 8, 4.00, 7500.00, 30000.00)
ON CONFLICT DO NOTHING;

-- Pedido 4 (María Fernanda López, Aranjuez): creado hace 1 hora, Pendiente,
-- con dirección de entrega. Sin abonos, así que sin crédito.
-- 2 x Blanca Tradicional x5 ($9.000) + 2 x Chócolo Tradicional x5 ($15.000) = $24.000
INSERT INTO pedido (id_pedido, id_cliente, id_sede, id_usuario, fecha_pedido, fecha_entrega, valor_total, estado, observaciones, medio_pago, direccion_entrega, origen) VALUES
(4, 4, 2, 3, CURRENT_TIMESTAMP - INTERVAL '1 hour', CURRENT_DATE + 1, 24000.00, 'Pendiente', 'Entrega a domicilio programada en Aranjuez', 'Efectivo', 'Calle 92 # 51A-24, Apt 301', 'personal')
ON CONFLICT DO NOTHING;

INSERT INTO detalle_pedido (id_detalle_pedido, id_pedido, id_producto, cantidad, precio_unitario, subtotal) VALUES
(7, 4, 6, 2.00, 4500.00, 9000.00),
(8, 4, 8, 2.00, 7500.00, 15000.00)
ON CONFLICT DO NOTHING;

-- Historial de estados: la fila Pendiente tiene la fecha del pedido y la fila
-- Entregado la de fecha_entregado. Solo se inserta si el pedido aún no tiene
-- esa fila (así una segunda ejecución no la duplica).
INSERT INTO pedido_estado_historial (id_pedido, estado_anterior, estado_nuevo, id_usuario, motivo, fecha_cambio)
SELECT h.id_pedido, h.estado_anterior, h.estado_nuevo, h.id_usuario, NULL, h.fecha_cambio
FROM (VALUES
  (1, NULL, 'Pendiente', 3, CURRENT_TIMESTAMP - INTERVAL '3 day'),
  (1, 'Pendiente', 'En proceso', 2, CURRENT_TIMESTAMP - INTERVAL '2 day 4 hour'),
  (1, 'En proceso', 'Entregado', 3, CURRENT_TIMESTAMP - INTERVAL '2 day'),
  (2, NULL, 'Pendiente', 3, CURRENT_TIMESTAMP - INTERVAL '2 day'),
  (2, 'Pendiente', 'En proceso', 2, CURRENT_TIMESTAMP - INTERVAL '1 day 6 hour'),
  (2, 'En proceso', 'Entregado', 3, CURRENT_TIMESTAMP - INTERVAL '1 day'),
  (3, NULL, 'Pendiente', 3, CURRENT_TIMESTAMP - INTERVAL '4 hour'),
  (3, 'Pendiente', 'En proceso', 2, CURRENT_TIMESTAMP - INTERVAL '2 hour'),
  (4, NULL, 'Pendiente', 3, CURRENT_TIMESTAMP - INTERVAL '1 hour')
) AS h (id_pedido, estado_anterior, estado_nuevo, id_usuario, fecha_cambio)
WHERE NOT EXISTS (
  SELECT 1 FROM pedido_estado_historial x
  WHERE x.id_pedido = h.id_pedido AND x.estado_nuevo = h.estado_nuevo
);

-- ----------------------------------------------------------------------------
-- 12. SECUENCIAS: el siguiente registro que cree el backend continúa después
-- de los ids fijos de este script.
-- ----------------------------------------------------------------------------
SELECT setval('cenarepas.sede_id_sede_seq', (SELECT MAX(id_sede) FROM sede)),
       setval('cenarepas.usuario_id_usuario_seq', (SELECT MAX(id_usuario) FROM usuario)),
       setval('cenarepas.proveedor_id_proveedor_seq', (SELECT MAX(id_proveedor) FROM proveedor)),
       setval('cenarepas.insumo_id_insumo_seq', (SELECT MAX(id_insumo) FROM insumo)),
       setval('cenarepas.categoria_producto_id_categoria_seq', (SELECT MAX(id_categoria) FROM categoria_producto)),
       setval('cenarepas.ficha_tecnica_id_ficha_seq', (SELECT MAX(id_ficha) FROM ficha_tecnica)),
       setval('cenarepas.ficha_tecnica_insumo_id_ficha_insumo_seq', (SELECT MAX(id_ficha_insumo) FROM ficha_tecnica_insumo)),
       setval('cenarepas.producto_id_producto_seq', (SELECT MAX(id_producto) FROM producto)),
       setval('cenarepas.cliente_id_cliente_seq', (SELECT MAX(id_cliente) FROM cliente)),
       setval('cenarepas.compra_id_compra_seq', (SELECT MAX(id_compra) FROM compra)),
       setval('cenarepas.detalle_compra_id_detalle_compra_seq', (SELECT MAX(id_detalle_compra) FROM detalle_compra)),
       setval('cenarepas.lote_produccion_id_lote_seq', (SELECT MAX(id_lote) FROM lote_produccion)),
       setval('cenarepas.lote_produccion_insumo_id_lote_insumo_seq', (SELECT MAX(id_lote_insumo) FROM lote_produccion_insumo)),
       setval('cenarepas.pedido_id_pedido_seq', (SELECT MAX(id_pedido) FROM pedido)),
       setval('cenarepas.detalle_pedido_id_detalle_pedido_seq', (SELECT MAX(id_detalle_pedido) FROM detalle_pedido)),
       setval('cenarepas.credito_id_credito_seq', (SELECT MAX(id_credito) FROM credito)),
       setval('cenarepas.abono_id_abono_seq', (SELECT MAX(id_abono) FROM abono)),
       setval('cenarepas.pedido_estado_historial_id_historial_seq', (SELECT MAX(id_historial) FROM pedido_estado_historial));

COMMIT;
