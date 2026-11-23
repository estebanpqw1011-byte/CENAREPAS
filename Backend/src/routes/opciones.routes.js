import { Router } from 'express';
import { query } from '../config/db.js';
import { authenticate, tienePermiso } from '../middlewares/auth.middleware.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { ESTADOS_PEDIDO, MEDIOS_PAGO, MUNICIPIOS_ENTREGA, TIPOS_DOCUMENTO } from '../config/negocio.js';

/**
 * GET /opciones/:recurso → [{ id, nombre, ... }] para los selects de los
 * formularios. Solo registros ACTIVOS (un producto, además, de una categoría
 * activa). Las consultas son fijas: el recurso solo elige una de ellas.
 * Puede verlo quien gestiona ese módulo o quien lo usa en un formulario.
 */
const editar = (modulo) => [[modulo, 'crear'], [modulo, 'editar']];

const NOMBRES_DOCUMENTO = {
  CC: 'Cédula de ciudadanía', CE: 'Cédula de extranjería', NIT: 'NIT', PP: 'Pasaporte', TI: 'Tarjeta de identidad',
};

const RECURSOS = {
  clientes: {
    sql: `SELECT id_cliente AS id, nombre, tipo_documento, documento FROM cliente WHERE estado = 'Activo' ORDER BY nombre`,
    permisos: [['clientes', 'ver'], ...editar('pedidos')],
  },
  productos: {
    sql: `SELECT p.id_producto AS id, p.nombre, p.precio_venta, p.stock_actual, p.id_categoria
          FROM producto p JOIN categoria_producto c ON c.id_categoria = p.id_categoria
          WHERE p.estado = 'Activo' AND c.estado = 'Activo' ORDER BY p.nombre`,
    permisos: [['productos', 'ver'], ...editar('pedidos')],
  },
  proveedores: {
    sql: `SELECT id_proveedor AS id, nombre, tipo_documento, nit AS documento FROM proveedor WHERE estado = 'Activo' ORDER BY nombre`,
    permisos: [['proveedores', 'ver'], ...editar('compras'), ...editar('insumos'), ...editar('productos')],
  },
  insumos: {
    sql: `SELECT id_insumo AS id, nombre, unidad_medida, stock_actual FROM insumo WHERE estado = 'Activo' ORDER BY nombre`,
    permisos: [['insumos', 'ver'], ...editar('compras'), ...editar('fichas-tecnicas'), ...editar('produccion')],
  },
  categorias: {
    sql: `SELECT id_categoria AS id, nombre FROM categoria_producto WHERE estado = 'Activo' ORDER BY nombre`,
    permisos: [['categorias', 'ver'], ...editar('productos')],
  },
  'fichas-tecnicas': {
    sql: `SELECT id_ficha AS id, nombre, rendimiento_lote FROM ficha_tecnica WHERE estado = 'Activo' ORDER BY nombre`,
    permisos: [['fichas-tecnicas', 'ver'], ...editar('productos'), ...editar('produccion')],
  },
  sedes: {
    sql: `SELECT id_sede AS id, nombre FROM sede WHERE estado = 'Activo' ORDER BY nombre`,
    permisos: [['sedes', 'ver'], ...editar('pedidos')],
  },
  // Personal activo (responsables de producción, compras o pedidos); sin clientes.
  usuarios: {
    sql: `SELECT u.id_usuario AS id, u.nombre, r.nombre AS rol
          FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
          WHERE u.estado = 'Activo' AND r.estado = 'Activo' AND r.nombre <> 'Cliente' ORDER BY u.nombre`,
    permisos: [['usuarios', 'ver'], ...editar('produccion'), ...editar('compras'), ...editar('pedidos')],
  },
  roles: {
    sql: `SELECT id_rol AS id, nombre FROM rol WHERE estado = 'Activo' ORDER BY id_rol`,
    permisos: [['roles', 'ver'], ...editar('usuarios')],
  },
  // Listas fijas de config/negocio.js (las mismas que valida el backend).
  'medios-pago': { lista: MEDIOS_PAGO.map((m) => ({ id: m, nombre: m })) },
  'estados-pedido': { lista: ESTADOS_PEDIDO.map((e) => ({ id: e, nombre: e })) },
  'tipos-documento': { lista: TIPOS_DOCUMENTO.map((t) => ({ id: t, nombre: NOMBRES_DOCUMENTO[t] || t })) },
  'tipos-persona': { lista: [{ id: 'Natural', nombre: 'Natural' }, { id: 'Jurídica', nombre: 'Jurídica' }] },
  municipios: { lista: MUNICIPIOS_ENTREGA.map((m) => ({ id: m, nombre: m })) },
};

const router = Router();

router.get('/:recurso', authenticate, async (req, res, next) => {
  const recurso = RECURSOS[req.params.recurso];
  if (!recurso) return errorResponse(res, `Opciones no disponibles: ${req.params.recurso}`, 404);
  try {
    if (recurso.lista) return successResponse(res, recurso.lista);
    if (!(await tienePermiso(req.user.id_rol, recurso.permisos))) {
      return errorResponse(res, 'No tienes permiso para realizar esta acción', 403);
    }
    const { rows } = await query(recurso.sql);
    return successResponse(res, rows);
  } catch (error) {
    return next(error);
  }
});

export default router;
