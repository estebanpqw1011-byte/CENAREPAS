import bcrypt from 'bcryptjs';
import { query, pool } from './db.js';

async function seed() {
  console.log('🌱 [Seed]: Iniciando siembra integral de datos reales y conectados en PostgreSQL...');

  try {
    // ═══════════════════════════════════════════════════════════════
    // 1. ROLES DEL SISTEMA
    // ═══════════════════════════════════════════════════════════════
    const roles = [
      { id_rol: 1, nombre: 'Administrador', descripcion: 'Acceso total a todos los módulos y configuración del sistema', estado: 'Activo' },
      { id_rol: 2, nombre: 'Secretaria', descripcion: 'Gestión operativa de compras, insumos, producción, pedidos y ventas', estado: 'Activo' },
      { id_rol: 3, nombre: 'Vendedor', descripcion: 'Gestión comercial, atención a clientes, registro de pedidos y ventas', estado: 'Activo' },
      { id_rol: 4, nombre: 'Domiciliario', descripcion: 'Logística de despacho y entrega de pedidos a clientes y sedes', estado: 'Activo' }
    ];

    for (const r of roles) {
      await query(`
        INSERT INTO rol (id_rol, nombre, descripcion, estado)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id_rol) DO UPDATE 
        SET nombre = EXCLUDED.nombre, descripcion = EXCLUDED.descripcion, estado = EXCLUDED.estado
      `, [r.id_rol, r.nombre, r.descripcion, r.estado]);
    }
    console.log('✅ 1. Roles creados y sincronizados.');

    // ═══════════════════════════════════════════════════════════════
    // 2. PERMISOS Y MATRIZ POR ROL
    // ═══════════════════════════════════════════════════════════════
    const modulos = [
      'roles', 'usuarios', 'proveedores', 'insumos', 'compras', 
      'fichas-tecnicas', 'categorias', 'productos', 'produccion', 
      'clientes', 'pedidos', 'ventas', 'sedes', 'abonos', 'dashboard', 'configuracion'
    ];
    const acciones = ['ver', 'crear', 'editar', 'eliminar', 'anular', 'cambiar_estado', 'exportar'];

    for (const mod of modulos) {
      for (const acc of acciones) {
        await query(`
          INSERT INTO permiso (modulo, accion, estado)
          VALUES ($1, $2, 'Activo')
          ON CONFLICT (modulo, accion) DO NOTHING
        `, [mod, acc]);
      }
    }

    // Permisos Rol 1: Administrador (Todos)
    const allPerms = await query('SELECT id_permiso FROM permiso');
    for (const p of allPerms.rows) {
      await query(`
        INSERT INTO rol_permiso (id_rol, id_permiso)
        VALUES (1, $1)
        ON CONFLICT DO NOTHING
      `, [p.id_permiso]);
    }

    // Permisos Rol 2: Secretaria
    const secrePerms = await query(`
      SELECT id_permiso FROM permiso 
      WHERE modulo IN ('dashboard', 'proveedores', 'compras', 'categorias', 'insumos', 'produccion', 'productos', 'clientes', 'pedidos', 'ventas')
    `);
    for (const p of secrePerms.rows) {
      await query(`
        INSERT INTO rol_permiso (id_rol, id_permiso)
        VALUES (2, $1)
        ON CONFLICT DO NOTHING
      `, [p.id_permiso]);
    }

    // Permisos Rol 3: Vendedor
    const vendPerms = await query(`
      SELECT id_permiso FROM permiso 
      WHERE (modulo IN ('categorias', 'productos') AND accion = 'ver')
         OR (modulo = 'clientes' AND accion IN ('ver', 'crear', 'editar'))
         OR (modulo IN ('pedidos', 'ventas') AND accion IN ('ver', 'crear', 'editar', 'anular', 'cambiar_estado', 'exportar'))
    `);
    for (const p of vendPerms.rows) {
      await query(`
        INSERT INTO rol_permiso (id_rol, id_permiso)
        VALUES (3, $1)
        ON CONFLICT DO NOTHING
      `, [p.id_permiso]);
    }
    console.log('✅ 2. Permisos y matriz de asignación configurados.');

    // ═══════════════════════════════════════════════════════════════
    // 3. USUARIOS INICIALES POR ROL
    // ═══════════════════════════════════════════════════════════════
    const adminPass = await bcrypt.hash('admin123', 10);
    const secrePass = await bcrypt.hash('secretaria123', 10);
    const vendPass = await bcrypt.hash('vendedor123', 10);
    const domPass = await bcrypt.hash('domicilios123', 10);

    const users = [
      { nombre: 'Carlos Eduardo Gómez (Admin)', correo: 'admin@sistema.com', pass: adminPass, id_rol: 1 },
      { nombre: 'Laura Gómez (Secretaria)', correo: 'secretaria@cenarepas.com', pass: secrePass, id_rol: 2 },
      { nombre: 'Carlos Ruiz (Vendedor)', correo: 'vendedor@cenarepas.com', pass: vendPass, id_rol: 3 },
      { nombre: 'Diego Morales (Domiciliario)', correo: 'domicilios@cenarepas.com', pass: domPass, id_rol: 4 },
    ];

    for (const u of users) {
      await query(`
        INSERT INTO usuario (nombre, correo, contrasena_hash, id_rol, estado)
        VALUES ($1, $2, $3, $4, 'Activo')
        ON CONFLICT (correo) DO UPDATE 
        SET contrasena_hash = EXCLUDED.contrasena_hash, id_rol = EXCLUDED.id_rol, nombre = EXCLUDED.nombre, estado = 'Activo'
      `, [u.nombre, u.correo, u.pass, u.id_rol]);
    }
    console.log('✅ 3. Usuarios de prueba vinculados a sus roles.');

    // IDs de usuarios para referencias
    const adminUser = (await query("SELECT id_usuario FROM usuario WHERE correo = 'admin@sistema.com'")).rows[0]?.id_usuario || 1;
    const secreUser = (await query("SELECT id_usuario FROM usuario WHERE correo = 'secretaria@cenarepas.com'")).rows[0]?.id_usuario || adminUser;
    const vendUser = (await query("SELECT id_usuario FROM usuario WHERE correo = 'vendedor@cenarepas.com'")).rows[0]?.id_usuario || adminUser;

    // ═══════════════════════════════════════════════════════════════
    // 4. SEDES
    // ═══════════════════════════════════════════════════════════════
    const sedes = [
      { nombre: 'Sede Principal - Fábrica Central', direccion: 'Calle 10 # 43E-20, Medellín', telefono: '6044445566', horario_atencion: 'Lun - Sáb: 6:00 AM - 6:00 PM', responsable: 'Carlos Mario Restrepo' },
      { nombre: 'Punto de Venta Norte - Bello', direccion: 'Cra 50 # 38-12, Bello', telefono: '6044445567', horario_atencion: 'Lun - Dom: 7:00 AM - 9:00 PM', responsable: 'Ana María Jaramillo' },
      { nombre: 'Punto de Venta Poblado', direccion: 'Cra 43A # 7-50, Poblado', telefono: '6044445568', horario_atencion: 'Todos los días: 8:00 AM - 10:00 PM', responsable: 'Javier Ortiz' },
      { nombre: 'Punto de Venta Laureles', direccion: 'Circular 4 # 73-10, Laureles', telefono: '6044445569', horario_atencion: 'Todos los días: 7:00 AM - 9:30 PM', responsable: 'Mariana Duque' }
    ];

    for (const s of sedes) {
      await query(`
        INSERT INTO sede (nombre, direccion, telefono, horario_atencion, responsable, estado)
        VALUES ($1, $2, $3, $4, $5, 'Activo')
        ON CONFLICT DO NOTHING
      `, [s.nombre, s.direccion, s.telefono, s.horario_atencion, s.responsable]);
    }
    const firstSede = (await query('SELECT id_sede FROM sede LIMIT 1')).rows[0]?.id_sede || 1;
    console.log('✅ 4. Sedes registradas.');

    // ═══════════════════════════════════════════════════════════════
    // 5. PROVEEDORES
    // ═══════════════════════════════════════════════════════════════
    const proveedores = [
      { nombre: 'Molinos y Harinas El Sol S.A.S.', nit: '900.123.456-1', telefono: '3104567890', correo: 'ventas@harinaselsol.com', direccion: 'Cra 50 # 45-20, Zona Industrial' },
      { nombre: 'Lácteos del Valle & Quesos Especiales', nit: '890.987.654-2', telefono: '3117894561', correo: 'contacto@lacteosvalle.com', direccion: 'Av Regional # 12-80' },
      { nombre: 'Empaques y Soluciones Plásticas SAS', nit: '901.345.678-3', telefono: '3156781234', correo: 'pedidos@empaquessa.com', direccion: 'Calle 33 # 65-14' },
      { nombre: 'Distribuidora Cárnica San Martín', nit: '900.876.543-4', telefono: '3189012345', correo: 'sanmartin@carnicos.com', direccion: 'Cra 65 # 28-90' }
    ];

    for (const p of proveedores) {
      await query(`
        INSERT INTO proveedor (nombre, nit, telefono, correo, direccion, estado)
        VALUES ($1, $2, $3, $4, $5, 'Activo')
        ON CONFLICT (nit) DO UPDATE 
        SET nombre = EXCLUDED.nombre, telefono = EXCLUDED.telefono, correo = EXCLUDED.correo, direccion = EXCLUDED.direccion, estado = 'Activo'
      `, [p.nombre, p.nit, p.telefono, p.correo, p.direccion]);
    }
    console.log('✅ 5. Proveedores registrados.');

    const provSol = (await query("SELECT id_proveedor FROM proveedor WHERE nit = '900.123.456-1'")).rows[0]?.id_proveedor || 1;
    const provLac = (await query("SELECT id_proveedor FROM proveedor WHERE nit = '890.987.654-2'")).rows[0]?.id_proveedor || 1;
    const provEmp = (await query("SELECT id_proveedor FROM proveedor WHERE nit = '901.345.678-3'")).rows[0]?.id_proveedor || 1;
    const provCar = (await query("SELECT id_proveedor FROM proveedor WHERE nit = '900.876.543-4'")).rows[0]?.id_proveedor || 1;

    // ═══════════════════════════════════════════════════════════════
    // 6. INSUMOS DE MATERIA PRIMA
    // ═══════════════════════════════════════════════════════════════
    const insumos = [
      { nombre: 'Harina de Maíz Blanco Precristalizada', unidad_medida: 'Kg', stock_actual: 450, stock_minimo: 80, fecha_vencimiento: '2026-12-31', id_proveedor: provSol },
      { nombre: 'Harina de Maíz Amarillo Selecta', unidad_medida: 'Kg', stock_actual: 320, stock_minimo: 60, fecha_vencimiento: '2026-11-30', id_proveedor: provSol },
      { nombre: 'Queso Mozzarella Rallado Especial', unidad_medida: 'Kg', stock_actual: 180, stock_minimo: 40, fecha_vencimiento: '2026-10-15', id_proveedor: provLac },
      { nombre: 'Queso Doble Crema Bloque Campesino', unidad_medida: 'Kg', stock_actual: 120, stock_minimo: 30, fecha_vencimiento: '2026-10-20', id_proveedor: provLac },
      { nombre: 'Mantequilla Industrial Pura', unidad_medida: 'Kg', stock_actual: 65, stock_minimo: 15, fecha_vencimiento: '2026-10-30', id_proveedor: provLac },
      { nombre: 'Sal Marina Refinada', unidad_medida: 'Kg', stock_actual: 90, stock_minimo: 20, fecha_vencimiento: '2027-01-01', id_proveedor: provSol },
      { nombre: 'Pechuga de Pollo Desmechada Sazonada', unidad_medida: 'Kg', stock_actual: 85, stock_minimo: 20, fecha_vencimiento: '2026-09-30', id_proveedor: provCar },
      { nombre: 'Carne de Res Desmechada Criolla', unidad_medida: 'Kg', stock_actual: 95, stock_minimo: 25, fecha_vencimiento: '2026-09-30', id_proveedor: provCar },
      { nombre: 'Bolsas Termoencogibles x100 und', unidad_medida: 'Paquete', stock_actual: 150, stock_minimo: 30, fecha_vencimiento: null, id_proveedor: provEmp }
    ];

    for (const ins of insumos) {
      await query(`
        INSERT INTO insumo (nombre, unidad_medida, stock_actual, stock_minimo, fecha_vencimiento, id_proveedor, estado)
        VALUES ($1, $2, $3, $4, $5, $6, 'Activo')
        ON CONFLICT DO NOTHING
      `, [ins.nombre, ins.unidad_medida, ins.stock_actual, ins.stock_minimo, ins.fecha_vencimiento, ins.id_proveedor]);
    }
    console.log('✅ 6. Insumos registrados con stock y vencimientos.');

    // ═══════════════════════════════════════════════════════════════
    // 7. CATEGORÍAS DE PRODUCTO
    // ═══════════════════════════════════════════════════════════════
    const categorias = [
      { nombre: 'Arepas Tradicionales de Maíz', descripcion: 'Arepas clásicas elaboradas con puro maíz seleccionado' },
      { nombre: 'Arepas Rellenas Especiales', descripcion: 'Arepas generosamente rellenas de queso, pollo, carne o mixtas' },
      { nombre: 'Arepas Gourmet & Chócolo', descripcion: 'Recetas de autor, arepas de chócolo dulce y combinaciones premium' },
      { nombre: 'Bebidas y Complementos', descripcion: 'Bebidas artesanales, jugos naturales y acompañamientos' }
    ];

    for (const cat of categorias) {
      await query(`
        INSERT INTO categoria_producto (nombre, descripcion, estado)
        VALUES ($1, $2, 'Activo')
        ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion, estado = 'Activo'
      `, [cat.nombre, cat.descripcion]);
    }
    console.log('✅ 7. Categorías de producto creadas.');

    const catTrad = (await query("SELECT id_categoria FROM categoria_producto WHERE nombre LIKE '%Tradicionales%' LIMIT 1")).rows[0]?.id_categoria || 1;
    const catRell = (await query("SELECT id_categoria FROM categoria_producto WHERE nombre LIKE '%Rellenas%' LIMIT 1")).rows[0]?.id_categoria || 1;
    const catGour = (await query("SELECT id_categoria FROM categoria_producto WHERE nombre LIKE '%Gourmet%' LIMIT 1")).rows[0]?.id_categoria || 1;
    const catBeb = (await query("SELECT id_categoria FROM categoria_producto WHERE nombre LIKE '%Bebidas%' LIMIT 1")).rows[0]?.id_categoria || 1;

    // ═══════════════════════════════════════════════════════════════
    // 8. FICHAS TÉCNICAS Y RECETAS
    // ═══════════════════════════════════════════════════════════════
    const ft1 = await query(`
      INSERT INTO ficha_tecnica (nombre, descripcion, instrucciones_preparacion, tiempo_estimado_minutos, rendimiento_lote, estado)
      VALUES ('Ficha: Arepa con Queso Doble Crema', 'Fórmula estándar para lote de 100 arepas con queso', '1. Hidratar harina con agua tibia y sal. 2. Amasar 10 min. 3. Incorporar mantequilla y queso. 4. Moldear en discos de 120g. 5. Asar 4 min por cara.', 45, 100, 'Activo')
      ON CONFLICT DO NOTHING
      RETURNING id_ficha
    `);

    const ft2 = await query(`
      INSERT INTO ficha_tecnica (nombre, descripcion, instrucciones_preparacion, tiempo_estimado_minutos, rendimiento_lote, estado)
      VALUES ('Ficha: Arepa Rellena de Pollo y Queso', 'Fórmula para lote de 60 arepas rellenas gourmet', '1. Preparar masa base de maíz blanco. 2. Precocinar base. 3. Abrir bolsillo e insertar 80g de pollo desmechado y 40g queso mozzarella. 4. Sellar al vacío.', 60, 60, 'Activo')
      ON CONFLICT DO NOTHING
      RETURNING id_ficha
    `);

    const ft3 = await query(`
      INSERT INTO ficha_tecnica (nombre, descripcion, instrucciones_preparacion, tiempo_estimado_minutos, rendimiento_lote, estado)
      VALUES ('Ficha: Arepa de Chócolo con Quesillo', 'Fórmula para lote de 80 arepas de maíz tierno dulce', '1. Moler maíz chócolo fresco. 2. Incorporar panela líquida, sal y mantequilla. 3. Asar en plancha dorada. 4. Cubrir con quesillo campesino.', 50, 80, 'Activo')
      ON CONFLICT DO NOTHING
      RETURNING id_ficha
    `);

    const idFt1 = ft1.rows[0]?.id_ficha || (await query("SELECT id_ficha FROM ficha_tecnica WHERE nombre LIKE '%Queso Doble%' LIMIT 1")).rows[0]?.id_ficha || 1;
    const idFt2 = ft2.rows[0]?.id_ficha || (await query("SELECT id_ficha FROM ficha_tecnica WHERE nombre LIKE '%Pollo y Queso%' LIMIT 1")).rows[0]?.id_ficha || 2;
    const idFt3 = ft3.rows[0]?.id_ficha || (await query("SELECT id_ficha FROM ficha_tecnica WHERE nombre LIKE '%Chócolo%' LIMIT 1")).rows[0]?.id_ficha || 3;

    const insHarinaB = (await query("SELECT id_insumo FROM insumo WHERE nombre LIKE '%Blanco%' LIMIT 1")).rows[0]?.id_insumo;
    const insHarinaA = (await query("SELECT id_insumo FROM insumo WHERE nombre LIKE '%Amarillo%' LIMIT 1")).rows[0]?.id_insumo;
    const insQuesoM = (await query("SELECT id_insumo FROM insumo WHERE nombre LIKE '%Mozzarella%' LIMIT 1")).rows[0]?.id_insumo;
    const insPollo = (await query("SELECT id_insumo FROM insumo WHERE nombre LIKE '%Pollo%' LIMIT 1")).rows[0]?.id_insumo;

    if (idFt1 && insHarinaB && insQuesoM) {
      await query(`INSERT INTO ficha_tecnica_insumo (id_ficha, id_insumo, cantidad, unidad_medida) VALUES ($1, $2, 10, 'Kg'), ($1, $3, 5, 'Kg') ON CONFLICT DO NOTHING`, [idFt1, insHarinaB, insQuesoM]);
    }
    if (idFt2 && insHarinaB && insPollo) {
      await query(`INSERT INTO ficha_tecnica_insumo (id_ficha, id_insumo, cantidad, unidad_medida) VALUES ($1, $2, 8, 'Kg'), ($1, $3, 4.8, 'Kg') ON CONFLICT DO NOTHING`, [idFt2, insHarinaB, insPollo]);
    }
    console.log('✅ 8. Fichas técnicas e ingredientes asociados.');

    // ═══════════════════════════════════════════════════════════════
    // 9. PRODUCTOS TERMINADOS
    // ═══════════════════════════════════════════════════════════════
    const productos = [
      { nombre: 'Arepa de Queso Doble Crema x5', descripcion: 'Paquete de 5 arepas de tela con generoso queso campesino', id_categoria: catTrad, id_ficha: idFt1, precio_venta: 12500, stock_actual: 140, stock_minimo: 30, fecha_vencimiento: '2026-10-30', imagen_url: 'https://images.unsplash.com/photo-1710018349908-39d998a519b0?w=600&auto=format&fit=crop' },
      { nombre: 'Arepa Rellena de Pollo y Queso', descripcion: 'Arepa asada rellena de pechuga desmechada sazonada y queso', id_categoria: catRell, id_ficha: idFt2, precio_venta: 14000, stock_actual: 85, stock_minimo: 20, fecha_vencimiento: '2026-10-25', imagen_url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop' },
      { nombre: 'Arepa Rellena de Carne Desmechada', descripcion: 'Arepa artesanal con carne de res en reducción criolla y queso fundido', id_categoria: catRell, id_ficha: idFt2, precio_venta: 15500, stock_actual: 70, stock_minimo: 15, fecha_vencimiento: '2026-10-25', imagen_url: 'https://images.unsplash.com/photo-1625605927823-7f10eaab7927?w=600&auto=format&fit=crop' },
      { nombre: 'Arepa Rellena Mixta Trilogía', descripcion: 'Pollo, carne desmechada, tocineta crocante y doble queso', id_categoria: catRell, id_ficha: idFt2, precio_venta: 18000, stock_actual: 50, stock_minimo: 15, fecha_vencimiento: '2026-10-28', imagen_url: 'https://images.unsplash.com/photo-1644753787071-8933b5daed2d?w=600&auto=format&fit=crop' },
      { nombre: 'Arepa de Chócolo con Quesillo', descripcion: 'Arepa de maíz tierno dulce con mantequilla dorada y queso blanco', id_categoria: catGour, id_ficha: idFt3, precio_venta: 9500, stock_actual: 110, stock_minimo: 25, fecha_vencimiento: '2026-11-05', imagen_url: 'https://images.unsplash.com/photo-1587603366933-aa6947174c65?w=600&auto=format&fit=crop' },
      { nombre: 'Arepa Gourmet Santandereana', descripcion: 'Masa de maíz amarillo con chicharrón molido y toque de yuca', id_categoria: catGour, id_ficha: idFt3, precio_venta: 13000, stock_actual: 60, stock_minimo: 20, fecha_vencimiento: '2026-10-20', imagen_url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop' },
      { nombre: 'Jugo Natural de Frutos Rojos 400ml', descripcion: 'Jugo artesanal 100% pulpa natural sin conservantes', id_categoria: catBeb, id_ficha: null, precio_venta: 6000, stock_actual: 90, stock_minimo: 20, fecha_vencimiento: '2026-09-28', imagen_url: 'https://images.unsplash.com/photo-1644753787067-d62ae70f303d?w=600&auto=format&fit=crop' },
      { nombre: 'Chocolate Tradicional Corona 300ml', descripcion: 'Chocolate caliente con toque de canela y clavo', id_categoria: catBeb, id_ficha: null, precio_venta: 5000, stock_actual: 120, stock_minimo: 30, fecha_vencimiento: '2026-12-15', imagen_url: 'https://images.unsplash.com/photo-1587603366933-aa6947174c65?w=600&auto=format&fit=crop' }
    ];

    for (const p of productos) {
      await query(`
        INSERT INTO producto (nombre, descripcion, id_categoria, id_ficha, precio_venta, stock_actual, stock_minimo, fecha_vencimiento, imagen_url, estado)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Activo')
        ON CONFLICT DO NOTHING
      `, [p.nombre, p.descripcion, p.id_categoria, p.id_ficha, p.precio_venta, p.stock_actual, p.stock_minimo, p.fecha_vencimiento, p.imagen_url]);
    }
    console.log('✅ 9. Catálogo de productos terminados registrado.');

    // ═══════════════════════════════════════════════════════════════
    // 10. CLIENTES
    // ═══════════════════════════════════════════════════════════════
    const clientes = [
      { nombre: 'Restaurante Sabor Colombiano SAS', documento: '901.888.777-5', telefono: '3001234567', correo: 'compras@saborcolombiano.co', direccion: 'Cra 43A # 18 Sur - 40, Medellín' },
      { nombre: 'Cafetería & Panadería La Esquina', documento: '71.234.567', telefono: '3128901234', correo: 'laesquina.cafe@gmail.com', direccion: 'Calle 50 # 70-15, Laureles' },
      { nombre: 'Distribuidora Alimenticia Paisa', documento: '900.555.444-1', telefono: '3157778899', correo: 'contacto@distripaisa.com', direccion: 'Av Guayabal # 10-30' },
      { nombre: 'María Fernanda López', documento: '1.037.654.321', telefono: '3206549870', correo: 'mafe.lopez@outlook.com', direccion: 'Calle 10A # 30-45, Apt 502' },
      { nombre: 'Carlos Eduardo Gómez', documento: '98.765.432', telefono: '3184561230', correo: 'carlos.gomez@gmail.com', direccion: 'Cra 76 # 33-89, Belén' }
    ];

    for (const c of clientes) {
      await query(`
        INSERT INTO cliente (nombre, documento, telefono, correo, direccion, estado)
        VALUES ($1, $2, $3, $4, $5, 'Activo')
        ON CONFLICT DO NOTHING
      `, [c.nombre, c.documento, c.telefono, c.correo, c.direccion]);
    }
    console.log('✅ 10. Directorio de clientes registrado.');

    const firstCli = (await query('SELECT id_cliente FROM cliente LIMIT 1')).rows[0]?.id_cliente || 1;
    const secondCli = (await query('SELECT id_cliente FROM cliente OFFSET 1 LIMIT 1')).rows[0]?.id_cliente || firstCli;

    // ═══════════════════════════════════════════════════════════════
    // 11. CONTROL DE PRODUCCIÓN (LOTES)
    // ═══════════════════════════════════════════════════════════════
    if (idFt1 && adminUser) {
      await query(`
        INSERT INTO lote_produccion (id_ficha, id_usuario_responsable, fecha_produccion, cantidad_producida, estado, observaciones)
        VALUES 
          ($1, $2, CURRENT_DATE - INTERVAL '2 day', 150, 'Terminado', 'Lote matutino superó estándar de calidad sensorial'),
          ($1, $2, CURRENT_DATE - INTERVAL '1 day', 200, 'Terminado', 'Producción para pedidos institucionales del fin de semana'),
          ($1, $2, CURRENT_DATE, 120, 'En proceso', 'En proceso de moldeado y control térmico en planta')
        ON CONFLICT DO NOTHING
      `, [idFt1, adminUser]);
      console.log('✅ 11. Lotes de producción con trazabilidad registrados.');
    }

    // ═══════════════════════════════════════════════════════════════
    // 12. GESTIÓN DE COMPRAS
    // ═══════════════════════════════════════════════════════════════
    const insHarinaId = (await query('SELECT id_insumo FROM insumo LIMIT 1')).rows[0]?.id_insumo || 1;
    const insQuesoId = (await query('SELECT id_insumo FROM insumo OFFSET 2 LIMIT 1')).rows[0]?.id_insumo || 2;

    const comp1 = await query(`
      INSERT INTO compra (id_proveedor, id_usuario, fecha_compra, valor_total, medio_pago, estado)
      VALUES ($1, $2, CURRENT_DATE - INTERVAL '3 day', 1450000, 'Transferencia', 'Registrada')
      RETURNING id_compra
    `, [provSol, secreUser]);

    if (comp1.rows[0]?.id_compra) {
      const idC = comp1.rows[0].id_compra;
      await query(`
        INSERT INTO detalle_compra (id_compra, id_insumo, cantidad, valor_unitario, subtotal)
        VALUES 
          ($1, $2, 200, 7250, 1450000)
        ON CONFLICT DO NOTHING
      `, [idC, insHarinaId]);
    }

    const comp2 = await query(`
      INSERT INTO compra (id_proveedor, id_usuario, fecha_compra, valor_total, medio_pago, estado)
      VALUES ($1, $2, CURRENT_DATE - INTERVAL '1 day', 980000, 'Efectivo', 'Registrada')
      RETURNING id_compra
    `, [provLac, secreUser]);

    if (comp2.rows[0]?.id_compra) {
      const idC2 = comp2.rows[0].id_compra;
      await query(`
        INSERT INTO detalle_compra (id_compra, id_insumo, cantidad, valor_unitario, subtotal)
        VALUES 
          ($1, $2, 40, 24500, 980000)
        ON CONFLICT DO NOTHING
      `, [idC2, insQuesoId]);
    }
    console.log('✅ 12. Compras con detalles registradas.');

    // ═══════════════════════════════════════════════════════════════
    // 13. PEDIDOS, VENTAS Y ABONOS
    // ═══════════════════════════════════════════════════════════════
    const prod1 = (await query('SELECT id_producto, precio_venta FROM producto LIMIT 1')).rows[0];
    const prod2 = (await query('SELECT id_producto, precio_venta FROM producto OFFSET 1 LIMIT 1')).rows[0];

    // Pedido 1 (Entregado y Pagado)
    const ped1 = await query(`
      INSERT INTO pedido (id_cliente, id_sede, id_usuario, fecha_pedido, fecha_entrega, valor_total, estado, observaciones)
      VALUES ($1, $2, $3, NOW() - INTERVAL '2 day', CURRENT_DATE - INTERVAL '1 day', 125000, 'Entregado', 'Entrega puntual en sede restaurante')
      RETURNING id_pedido
    `, [firstCli, firstSede, vendUser]);

    if (ped1.rows[0]?.id_pedido && prod1) {
      const idP1 = ped1.rows[0].id_pedido;
      await query(`
        INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
        VALUES ($1, $2, 10, $3, 125000)
        ON CONFLICT DO NOTHING
      `, [idP1, prod1.id_producto, prod1.precio_venta]);

      // Venta vinculada a Pedido 1
      const ven1 = await query(`
        INSERT INTO venta (id_sede, id_cliente, id_usuario, id_pedido, fecha_venta, valor_total, medio_pago, estado)
        VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 day', 125000, 'Transferencia', 'Pagada')
        RETURNING id_venta
      `, [firstSede, firstCli, vendUser, idP1]);

      if (ven1.rows[0]?.id_venta) {
        const idV1 = ven1.rows[0].id_venta;
        await query(`
          INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal)
          VALUES ($1, $2, 10, $3, 125000)
          ON CONFLICT DO NOTHING
        `, [idV1, prod1.id_producto, prod1.precio_venta]);

        await query(`
          INSERT INTO abono (id_cliente, id_pedido, id_venta, fecha_abono, valor_abonado, saldo_pendiente, medio_pago, estado)
          VALUES ($1, NULL, $2, CURRENT_DATE - INTERVAL '1 day', 125000, 0, 'Transferencia', 'Registrado')
          ON CONFLICT DO NOTHING
        `, [firstCli, idV1]);
      }
    }

    // Pedido 2 (En preparacion)
    const ped2 = await query(`
      INSERT INTO pedido (id_cliente, id_sede, id_usuario, fecha_pedido, fecha_entrega, valor_total, estado, observaciones)
      VALUES ($1, $2, $3, NOW(), CURRENT_DATE + INTERVAL '1 day', 210000, 'En preparacion', 'Pedido para entrega matutina con empaque al vacío')
      RETURNING id_pedido
    `, [secondCli, firstSede, vendUser]);

    if (ped2.rows[0]?.id_pedido && prod2) {
      const idP2 = ped2.rows[0].id_pedido;
      await query(`
        INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
        VALUES ($1, $2, 15, $3, 210000)
        ON CONFLICT DO NOTHING
      `, [idP2, prod2.id_producto, prod2.precio_venta]);

      // Venta con Abono Parcial (50%)
      const ven2 = await query(`
        INSERT INTO venta (id_sede, id_cliente, id_usuario, id_pedido, fecha_venta, valor_total, medio_pago, estado)
        VALUES ($1, $2, $3, $4, NOW(), 210000, 'Transferencia', 'Pendiente')
        RETURNING id_venta
      `, [firstSede, secondCli, vendUser, idP2]);

      if (ven2.rows[0]?.id_venta) {
        const idV2 = ven2.rows[0].id_venta;
        await query(`
          INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario, subtotal)
          VALUES ($1, $2, 15, $3, 210000)
          ON CONFLICT DO NOTHING
        `, [idV2, prod2.id_producto, prod2.precio_venta]);

        await query(`
          INSERT INTO abono (id_cliente, id_pedido, id_venta, fecha_abono, valor_abonado, saldo_pendiente, medio_pago, estado)
          VALUES ($1, NULL, $2, CURRENT_DATE, 105000, 105000, 'Transferencia', 'Registrado')
          ON CONFLICT DO NOTHING
        `, [secondCli, idV2]);
      }
    }

    console.log('✅ 13. Pedidos, ventas y abonos con trazabilidad registrados.');
    console.log('✨ [Seed Finalizado]: ¡Base de datos CenArepas 100% sembrada, relacionada y lista para producción!');

  } catch (err) {
    console.error('❌ [Seed Error]:', err);
  } finally {
    await pool.end();
  }
}

seed();
