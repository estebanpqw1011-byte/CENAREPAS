import { query } from '../config/db.js';
import { enTransaccion } from '../utils/transaccion.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/httpError.js';
import { enteroPositivo, normalizarEstadoPedido, normalizarMedioPago, texto } from '../utils/normalizar.js';
import {
  ANTICIPACION_ANULAR_HORAS, COSTO_ENVIO, HORAS_LIMITE_ANULACION, MOTIVO_ANULACION_MAX, MOTIVO_ANULACION_MIN,
  MUNICIPIOS_ENTREGA, ROLES_ANULAR_VENTA, SEDE_PEDIDOS_CLIENTE, TRANSICIONES_PEDIDO,
} from '../config/negocio.js';
import { CreditosService } from './creditos.service.js';
import { eliminarSinAsociados } from '../utils/eliminacion.js';
import { NotificacionesService } from './notificaciones.service.js';

/**
 * Pedido único (pedidos y ventas fusionados): Pendiente → En proceso →
 * Entregado (es la venta: descuenta stock, CA-121-002) y Anulado (repone el
 * stock si ya se había descontado). El total SIEMPRE se calcula aquí con los
 * precios de la base, dentro de una transacción.
 */
const SELECT_PEDIDO = `
  SELECT p.*,
         c.nombre AS cliente_nombre, c.documento AS cliente_documento, c.telefono AS cliente_telefono,
         s.nombre AS sede_nombre, u.nombre AS usuario_nombre,
         cr.id_credito, cr.valor_abonado AS credito_abonado, cr.saldo_pendiente AS credito_saldo,
         cr.estado AS credito_estado,
         COALESCE(
           json_agg(
             json_build_object(
               'id_detalle_pedido', dp.id_detalle_pedido,
               'id_producto', dp.id_producto,
               'producto_nombre', pr.nombre,
               'producto_estado', pr.estado,
               'imagen_url', pr.imagen_url,
               'precio_actual', pr.precio_venta,
               'cantidad', dp.cantidad,
               'precio_unitario', dp.precio_unitario,
               'subtotal', dp.subtotal
             ) ORDER BY dp.id_detalle_pedido
           ) FILTER (WHERE dp.id_detalle_pedido IS NOT NULL),
           '[]'
         ) AS detalles
  FROM pedido p
  LEFT JOIN cliente c ON p.id_cliente = c.id_cliente
  LEFT JOIN sede s ON p.id_sede = s.id_sede
  LEFT JOIN usuario u ON p.id_usuario = u.id_usuario
  LEFT JOIN credito cr ON cr.id_pedido = p.id_pedido
  LEFT JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
  LEFT JOIN producto pr ON dp.id_producto = pr.id_producto`;

const GROUP_PEDIDO = `GROUP BY p.id_pedido, c.id_cliente, s.id_sede, u.id_usuario, cr.id_credito`;

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const fechaISO = (fecha) => {
  if (!fecha) return null;
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export class PedidosService {
  // ─── Consultas ───

  /** Filtros opcionales: estado, idCliente. */
  static async getAll({ estado, idCliente } = {}) {
    const res = await query(
      `${SELECT_PEDIDO}
       WHERE ($1::text IS NULL OR p.estado = $1) AND ($2::int IS NULL OR p.id_cliente = $2)
       ${GROUP_PEDIDO}
       ORDER BY p.id_pedido DESC`,
      [estado || null, idCliente || null]
    );
    return res.rows;
  }

  static async getById(id, { idCliente } = {}) {
    const res = await query(
      `${SELECT_PEDIDO}
       WHERE p.id_pedido = $1 AND ($2::int IS NULL OR p.id_cliente = $2)
       ${GROUP_PEDIDO}`,
      [id, idCliente || null]
    );
    const pedido = res.rows[0];
    if (!pedido) return null;
    const abonos = await CreditosService.listarAbonos({ idPedido: pedido.id_pedido });
    return { ...pedido, abonos };
  }

  /**
   * Historial de estados (migración 010), del más antiguo al más reciente.
   * Del usuario solo se devuelven el nombre y el rol (nada de correo ni otros
   * datos personales). null si el pedido no existe (o no es del cliente, con
   * idCliente).
   */
  static async historial(id, { idCliente } = {}) {
    const existe = await query(
      'SELECT 1 FROM pedido WHERE id_pedido = $1 AND ($2::int IS NULL OR id_cliente = $2)',
      [id, idCliente || null]
    );
    if (existe.rows.length === 0) return null;
    const res = await query(
      `SELECT h.id_historial, h.id_pedido, h.estado_anterior, h.estado_nuevo, h.id_usuario,
              u.nombre AS usuario_nombre, r.nombre AS rol_nombre, h.motivo, h.fecha_cambio, h.reconstruido
       FROM pedido_estado_historial h
       LEFT JOIN usuario u ON u.id_usuario = h.id_usuario
       LEFT JOIN rol r ON r.id_rol = u.id_rol
       WHERE h.id_pedido = $1
       ORDER BY h.fecha_cambio, h.id_historial`,
      [id]
    );
    return res.rows;
  }

  // ─── Validaciones comunes ───

  static #fechaEntrega(valor) {
    const fecha = texto(valor).slice(0, 10);
    if (!FECHA_REGEX.test(fecha)) throw badRequest('La fecha de entrega es obligatoria (AAAA-MM-DD)');
    return fecha;
  }

  /** Agrupa productos repetidos y valida cantidades enteras ≥ 1 (CA-116-002). */
  static #normalizarDetalles(detalles) {
    if (!Array.isArray(detalles) || detalles.length === 0) {
      throw badRequest('El pedido debe tener al menos un producto');
    }
    const porProducto = new Map();
    for (const d of detalles) {
      const id = enteroPositivo(d.id_producto, 'id_producto');
      const cantidad = enteroPositivo(d.cantidad, 'La cantidad');
      porProducto.set(id, (porProducto.get(id) || 0) + cantidad);
    }
    return [...porProducto.entries()].map(([id_producto, cantidad]) => ({ id_producto, cantidad }));
  }

  /** Precios y disponibilidad desde la base (nunca desde el cliente). */
  static async #cotizar(db, detalles, { validarStock }) {
    const res = await db.query(
      `SELECT p.id_producto, p.nombre, p.precio_venta, p.stock_actual, p.estado,
              (p.fecha_vencimiento IS NOT NULL AND p.fecha_vencimiento < CURRENT_DATE) AS vencido,
              c.estado AS categoria_estado
       FROM producto p JOIN categoria_producto c ON c.id_categoria = p.id_categoria
       WHERE p.id_producto = ANY($1::int[])`,
      [detalles.map((d) => d.id_producto)]
    );
    const productos = new Map(res.rows.map((p) => [p.id_producto, p]));

    let total = 0;
    const lineas = detalles.map(({ id_producto, cantidad }) => {
      const p = productos.get(id_producto);
      if (!p) throw badRequest(`El producto #${id_producto} no existe`);
      if (p.estado !== 'Activo' || p.categoria_estado !== 'Activo') {
        throw badRequest(`${p.nombre} ya no está disponible`);
      }
      if (p.vencido) throw badRequest(`${p.nombre} está vencido y no se puede pedir`);
      if (validarStock && Number(p.stock_actual) < cantidad) {
        throw badRequest(`Solo hay ${Number(p.stock_actual)} unidades de ${p.nombre}`);
      }
      const precio = Number(p.precio_venta);
      const subtotal = precio * cantidad;
      total += subtotal;
      return { id_producto, cantidad, precio_unitario: precio, subtotal };
    });
    return { lineas, total };
  }

  static async #guardarDetalles(db, idPedido, lineas) {
    await db.query('DELETE FROM detalle_pedido WHERE id_pedido = $1', [idPedido]);
    for (const l of lineas) {
      await db.query(
        `INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5)`,
        [idPedido, l.id_producto, l.cantidad, l.precio_unitario, l.subtotal]
      );
    }
  }

  static async #sedeActiva(db, { idSede, nombre }) {
    const res = await db.query(
      `SELECT id_sede FROM sede WHERE estado = 'Activo' AND (id_sede = $1 OR ($1::int IS NULL AND nombre = $2))`,
      [idSede || null, nombre || null]
    );
    if (res.rows.length === 0) {
      throw badRequest(idSede ? 'La sede seleccionada no está activa' : 'La sede por defecto no está configurada');
    }
    return res.rows[0].id_sede;
  }

  static async #clienteActivo(db, idCliente) {
    const res = await db.query('SELECT estado FROM cliente WHERE id_cliente = $1', [idCliente]);
    if (res.rows.length === 0) throw badRequest('El cliente no existe');
    if (res.rows[0].estado !== 'Activo') throw badRequest('El cliente está inactivo');
  }

  // ─── Creación ───

  /** Pedido registrado por el personal (HU-106). Siempre nace Pendiente. */
  static async crearPorPersonal(usuario, datos) {
    const idCliente = enteroPositivo(datos.id_cliente, 'El cliente');
    const fechaEntrega = this.#fechaEntrega(datos.fecha_entrega);
    const detalles = this.#normalizarDetalles(datos.detalles);
    const medioPago = normalizarMedioPago(datos.medio_pago);

    const idPedido = await enTransaccion(async (db) => {
      await this.#clienteActivo(db, idCliente);
      const idSede = await this.#sedeActiva(
        db, datos.id_sede ? { idSede: Number(datos.id_sede) } : { nombre: SEDE_PEDIDOS_CLIENTE }
      );
      const { lineas, total } = await this.#cotizar(db, detalles, { validarStock: false });
      const res = await db.query(
        `INSERT INTO pedido (id_cliente, id_sede, id_usuario, fecha_entrega, valor_total, estado, observaciones,
                             medio_pago, direccion_entrega, origen)
         VALUES ($1, $2, $3, $4, $5, 'Pendiente', $6, $7, $8, 'personal')
         RETURNING *`,
        [idCliente, idSede, usuario.id_usuario, fechaEntrega, total, texto(datos.observaciones) || null,
          medioPago, texto(datos.direccion_entrega) || null]
      );
      await this.#guardarDetalles(db, res.rows[0].id_pedido, lineas);
      await this.#registrarEstado(db, res.rows[0].id_pedido, null, 'Pendiente', usuario.id_usuario);
      await NotificacionesService.pedidoCreado(db, res.rows[0]);
      return res.rows[0].id_pedido;
    });
    return this.getById(idPedido);
  }

  /**
   * Checkout del cliente (HU-158 a HU-161). El id_cliente sale del token.
   * comprobanteUrl ya viene validado (subido por este mismo usuario).
   */
  static async crearPorCliente(usuario, datos, comprobanteUrl) {
    if (!usuario.id_cliente) throw forbidden('Tu cuenta no está vinculada a un cliente');
    const fechaEntrega = this.#fechaEntrega(datos.fecha_entrega);
    const detalles = this.#normalizarDetalles(datos.detalles);
    const medioPago = normalizarMedioPago(datos.medio_pago, { requerido: true });

    const entrega = datos.entrega && typeof datos.entrega === 'object' ? datos.entrega : datos;
    const municipio = texto(entrega.municipio);
    const barrio = texto(entrega.barrio);
    const direccion = texto(entrega.direccion);
    const errores = {};
    if (!MUNICIPIOS_ENTREGA.includes(municipio)) errores.municipio = 'Solo entregamos en el Área Metropolitana de Medellín';
    if (direccion.length < 5) errores.direccion = 'Ingresa la dirección de entrega';
    if (!barrio) errores.barrio = 'Ingresa el barrio';
    if (Object.keys(errores).length > 0) throw badRequest('Revisa la dirección de entrega', errores);
    if (medioPago === 'Transferencia' && !comprobanteUrl) {
      throw badRequest('Para pagar por transferencia debes adjuntar el comprobante (JPG, PNG o PDF de máximo 5 MB)');
    }

    const valorAbono = Number(datos.valor_abono || 0);

    const idPedido = await enTransaccion(async (db) => {
      const vigente = await db.query('SELECT $1::date >= CURRENT_DATE AS ok', [fechaEntrega]);
      if (!vigente.rows[0].ok) throw badRequest('La fecha de entrega no puede ser anterior a hoy');

      await this.#clienteActivo(db, usuario.id_cliente);
      const idSede = await this.#sedeActiva(db, { nombre: SEDE_PEDIDOS_CLIENTE });
      const { lineas, total: subtotal } = await this.#cotizar(db, detalles, { validarStock: true });
      const total = subtotal + COSTO_ENVIO;

      // CA-161-001: el abono es mayor a 0 y menor al total.
      if (valorAbono !== 0 && (!Number.isInteger(valorAbono) || valorAbono <= 0 || valorAbono >= total)) {
        throw badRequest(`El abono debe ser mayor a $0 y menor al total del pedido ($${total.toLocaleString('es-CO')})`);
      }

      const res = await db.query(
        `INSERT INTO pedido (id_cliente, id_sede, id_usuario, fecha_entrega, valor_total, estado, observaciones,
                             medio_pago, comprobante_url, direccion_entrega, municipio_entrega, barrio_entrega,
                             complemento_entrega, indicaciones_entrega, origen)
         VALUES ($1, $2, $3, $4, $5, 'Pendiente', $6, $7, $8, $9, $10, $11, $12, $13, 'app')
         RETURNING *`,
        [usuario.id_cliente, idSede, usuario.id_usuario, fechaEntrega, total, texto(datos.observaciones) || null,
          medioPago, comprobanteUrl, direccion, municipio, barrio,
          texto(entrega.complemento) || null, texto(entrega.indicaciones) || null]
      );
      const pedido = res.rows[0];
      await this.#guardarDetalles(db, pedido.id_pedido, lineas);
      await this.#registrarEstado(db, pedido.id_pedido, null, 'Pendiente', usuario.id_usuario);

      let saldo = 0;
      if (valorAbono > 0) {
        await CreditosService.abonoInicial(db, pedido, {
          valor: valorAbono, medioPago, comprobanteUrl, idUsuario: usuario.id_usuario,
        });
        saldo = total - valorAbono;
      }
      await NotificacionesService.pedidoCreado(db, pedido, saldo);
      return pedido.id_pedido;
    });
    return this.getById(idPedido);
  }

  // ─── Edición y estados ───

  /**
   * Edición del personal (HU-110). Productos, cliente y fecha solo mientras
   * está Pendiente; sede, observaciones y medio de pago también En proceso.
   * Si llega un estado distinto (la web envía el pedido completo) se aplica
   * la transición con sus reglas.
   */
  static async update(usuario, id, datos) {
    const nuevoEstado = normalizarEstadoPedido(datos.estado);
    const tocaContenido = datos.detalles !== undefined || datos.id_cliente !== undefined || datos.fecha_entrega !== undefined;

    const existe = await enTransaccion(async (db) => {
      const res = await db.query('SELECT * FROM pedido WHERE id_pedido = $1 FOR UPDATE', [id]);
      const pedido = res.rows[0];
      if (!pedido) return false;

      if (pedido.estado === 'Pendiente' && tocaContenido) {
        const idCliente = datos.id_cliente ? enteroPositivo(datos.id_cliente, 'El cliente') : pedido.id_cliente;
        if (idCliente !== pedido.id_cliente) await this.#clienteActivo(db, idCliente);
        const fechaEntrega = datos.fecha_entrega ? this.#fechaEntrega(datos.fecha_entrega) : pedido.fecha_entrega;
        let total = Number(pedido.valor_total);
        if (datos.detalles !== undefined) {
          const { lineas, total: nuevo } = await this.#cotizar(db, this.#normalizarDetalles(datos.detalles), { validarStock: false });
          await this.#guardarDetalles(db, id, lineas);
          total = nuevo + (pedido.origen === 'app' ? COSTO_ENVIO : 0);
          const credito = await db.query('SELECT valor_abonado FROM credito WHERE id_pedido = $1', [id]);
          if (credito.rows[0] && total < Number(credito.rows[0].valor_abonado)) {
            throw conflict('El nuevo total es menor a lo que el cliente ya abonó');
          }
          await db.query(
            `UPDATE credito SET valor_total = $1, saldo_pendiente = $1 - valor_abonado,
                    estado = CASE WHEN $1 - valor_abonado <= 0 THEN 'Pagado' ELSE 'Activo' END
             WHERE id_pedido = $2 AND estado <> 'Anulado'`,
            [total, id]
          );
        }
        await db.query(
          'UPDATE pedido SET id_cliente = $1, fecha_entrega = $2, valor_total = $3 WHERE id_pedido = $4',
          [idCliente, fechaEntrega, total, id]
        );
      } else if (tocaContenido && (await this.#cambiaContenido(db, pedido, datos))) {
        throw conflict('Solo se pueden modificar productos, cliente y fecha de un pedido Pendiente');
      }

      if (['Pendiente', 'En proceso'].includes(pedido.estado)) {
        const idSede = datos.id_sede ? await this.#sedeActiva(db, { idSede: Number(datos.id_sede) }) : pedido.id_sede;
        await db.query(
          `UPDATE pedido SET id_sede = $1, observaciones = COALESCE($2, observaciones),
                  medio_pago = COALESCE($3, medio_pago)
           WHERE id_pedido = $4`,
          [idSede, datos.observaciones !== undefined ? texto(datos.observaciones) || null : null,
            normalizarMedioPago(datos.medio_pago), id]
        );
      }

      if (nuevoEstado && nuevoEstado !== pedido.estado) {
        await this.#aplicarEstado(db, usuario, id, nuevoEstado, datos.motivo_anulacion || datos.motivo);
      }
      return true;
    });
    return existe ? this.getById(id) : null;
  }

  /** La web reenvía el pedido completo aunque no cambie: solo es error si de verdad cambia. */
  static async #cambiaContenido(db, pedido, datos) {
    if (datos.id_cliente !== undefined && Number(datos.id_cliente) !== pedido.id_cliente) return true;
    if (datos.fecha_entrega && texto(String(datos.fecha_entrega)).slice(0, 10) !== fechaISO(pedido.fecha_entrega)) {
      return true;
    }
    if (Array.isArray(datos.detalles)) {
      const firma = (items) => items.map((d) => `${Number(d.id_producto)}x${Number(d.cantidad)}`).sort().join();
      const actuales = await db.query('SELECT id_producto, cantidad FROM detalle_pedido WHERE id_pedido = $1', [pedido.id_pedido]);
      return firma(this.#normalizarDetalles(datos.detalles)) !== firma(actuales.rows);
    }
    return false;
  }

  /** Cambio de estado por el personal (HU-118). */
  static async cambiarEstado(usuario, id, estado, motivo) {
    const nuevoEstado = normalizarEstadoPedido(estado);
    if (!nuevoEstado) throw badRequest('Indica el nuevo estado');
    await enTransaccion(async (db) => {
      const existe = await db.query('SELECT 1 FROM pedido WHERE id_pedido = $1', [id]);
      if (existe.rows.length === 0) throw notFound('Pedido no encontrado');
      await this.#aplicarEstado(db, usuario, id, nuevoEstado, motivo);
    });
    return this.getById(id);
  }

  static async #aplicarEstado(db, usuario, id, nuevoEstado, motivo) {
    const pedido = (await db.query('SELECT * FROM pedido WHERE id_pedido = $1 FOR UPDATE', [id])).rows[0];
    if (!TRANSICIONES_PEDIDO[pedido.estado].includes(nuevoEstado)) {
      throw conflict(`Un pedido ${pedido.estado} no puede pasar a ${nuevoEstado}`);
    }
    if (pedido.estado === 'Entregado' && nuevoEstado === 'Anulado') {
      await this.#validarAnulacionVenta(db, usuario, id, motivo);
    }
    let motivoNotificado = null;

    if (nuevoEstado === 'Entregado') {
      // CA-121-002: entregar = vender; descuenta el stock de forma atómica.
      const detalles = await db.query(
        `SELECT dp.id_producto, dp.cantidad, pr.nombre
         FROM detalle_pedido dp JOIN producto pr ON pr.id_producto = dp.id_producto
         WHERE dp.id_pedido = $1 ORDER BY dp.id_producto
         FOR UPDATE OF pr`,
        [id]
      );
      for (const d of detalles.rows) {
        const res = await db.query(
          `UPDATE producto SET stock_actual = stock_actual - $1
           WHERE id_producto = $2 AND stock_actual >= $1 RETURNING stock_actual`,
          [d.cantidad, d.id_producto]
        );
        if (res.rows.length === 0) throw conflict(`No hay stock suficiente de ${d.nombre} para entregar el pedido`);
      }
      await db.query(
        `UPDATE pedido SET estado = 'Entregado', fecha_entregado = NOW(), stock_descontado = TRUE WHERE id_pedido = $1`,
        [id]
      );
    } else if (nuevoEstado === 'Anulado') {
      // CA-111-002: el motivo queda en el historial. La web aún no lo pide (ver CAMBIOS_PENDIENTES_WEB.md).
      motivoNotificado = texto(motivo) || `Anulado por ${usuario.nombre} sin motivo registrado`;
      if (pedido.stock_descontado) {
        // CA-125-002: anular una venta repone el inventario.
        await db.query(
          `UPDATE producto pr SET stock_actual = pr.stock_actual + dp.cantidad
           FROM detalle_pedido dp WHERE dp.id_pedido = $1 AND dp.id_producto = pr.id_producto`,
          [id]
        );
      }
      await db.query(
        `UPDATE pedido SET estado = 'Anulado', motivo_anulacion = $1, fecha_anulacion = NOW(), stock_descontado = FALSE
         WHERE id_pedido = $2`,
        [motivoNotificado, id]
      );
      await CreditosService.anularDePedido(db, id, motivoNotificado);
    } else {
      await db.query('UPDATE pedido SET estado = $1 WHERE id_pedido = $2', [nuevoEstado, id]);
    }

    await this.#registrarEstado(db, id, pedido.estado, nuevoEstado, usuario.id_usuario, motivoNotificado);
    await NotificacionesService.pedidoEstado(db, { id_pedido: Number(id), estado: nuevoEstado }, motivoNotificado);
  }

  /**
   * Anular una venta (Entregado → Anulado), venga de Ventas o de Pedidos: solo
   * los ROLES_ANULAR_VENTA, con motivo y dentro de HORAS_LIMITE_ANULACION desde
   * fecha_entregado (una venta antigua sin esa fecha ya no se puede anular).
   */
  static async #validarAnulacionVenta(db, usuario, id, motivo) {
    if (!ROLES_ANULAR_VENTA.includes(usuario?.rol)) {
      throw forbidden(`Solo ${ROLES_ANULAR_VENTA.join(' o ')} puede anular una venta`);
    }
    const largo = texto(motivo).length;
    if (largo < MOTIVO_ANULACION_MIN || largo > MOTIVO_ANULACION_MAX) {
      throw badRequest(
        `Escribe el motivo de la anulación (entre ${MOTIVO_ANULACION_MIN} y ${MOTIVO_ANULACION_MAX} caracteres)`,
        { motivo: `Entre ${MOTIVO_ANULACION_MIN} y ${MOTIVO_ANULACION_MAX} caracteres` }
      );
    }
    const res = await db.query(
      `SELECT fecha_entregado IS NOT NULL
              AND fecha_entregado + make_interval(hours => $2) > LOCALTIMESTAMP AS a_tiempo
       FROM pedido WHERE id_pedido = $1`,
      [id, HORAS_LIMITE_ANULACION]
    );
    if (!res.rows[0]?.a_tiempo) {
      throw badRequest(
        `El plazo para anular esta venta ya venció: solo se puede anular durante las ${HORAS_LIMITE_ANULACION} horas siguientes a la entrega`
      );
    }
  }

  /**
   * Fila del historial de estados, dentro de la misma transacción del cambio:
   * si el cambio falla, tampoco queda la fila.
   */
  static async #registrarEstado(db, idPedido, anterior, nuevo, idUsuario, motivo = null) {
    await db.query(
      `INSERT INTO pedido_estado_historial (id_pedido, estado_anterior, estado_nuevo, id_usuario, motivo)
       VALUES ($1, $2, $3, $4, $5)`,
      [idPedido, anterior, nuevo, idUsuario || null, motivo]
    );
  }

  /** DELETE de la web: anula (nunca borra). */
  /**
   * Borrado definitivo: solo un pedido Pendiente sin abonos, crédito ni
   * venta (aún no descontó stock). Borra en la misma transacción su detalle,
   * su historial de estados y sus notificaciones. Los demás se anulan con
   * motivo (409).
   */
  static eliminarDefinitivo(id) {
    return eliminarSinAsociados({
      tabla: 'pedido',
      llave: 'id_pedido',
      id,
      noEncontrado: 'Pedido no encontrado',
      validar: (db, pedido) => {
        if (pedido.estado === 'Anulado') throw conflict('Este pedido ya está anulado y no se puede eliminar.');
        if (pedido.estado !== 'Pendiente') {
          throw conflict(`Solo se puede eliminar un pedido Pendiente; este está ${pedido.estado}. Anúlalo con un motivo.`);
        }
      },
      asociados: [
        { sql: 'SELECT 1 FROM abono WHERE id_pedido = $1', mensaje: 'Este pedido tiene abonos; anúlalo con un motivo.' },
        { sql: 'SELECT 1 FROM credito WHERE id_pedido = $1', mensaje: 'Este pedido tiene un crédito; anúlalo con un motivo.' },
        { sql: 'SELECT 1 FROM venta WHERE id_pedido = $1', mensaje: 'Este pedido tiene una venta asociada; anúlalo con un motivo.' },
      ],
      limpiar: [
        'DELETE FROM detalle_pedido WHERE id_pedido = $1',
        'DELETE FROM pedido_estado_historial WHERE id_pedido = $1',
        'DELETE FROM notificacion WHERE id_pedido = $1',
      ],
    });
  }

  static async anular(usuario, id, motivo) {
    const existe = await query('SELECT 1 FROM pedido WHERE id_pedido = $1', [id]);
    if (existe.rows.length === 0) return false;
    await enTransaccion((db) => this.#aplicarEstado(db, usuario, id, 'Anulado', motivo));
    return true;
  }

  /**
   * Anulación por el cliente (HU-164): solo sus pedidos, solo Pendiente, con
   * motivo y al menos ANTICIPACION_ANULAR_HORAS antes de la fecha de entrega
   * (contadas desde las 00:00 del día de entrega).
   */
  static async anularPorCliente(usuario, id, motivo) {
    if (texto(motivo).length < 5) throw badRequest('Cuéntanos el motivo de la anulación (mínimo 5 caracteres)');
    await enTransaccion(async (db) => {
      const res = await db.query(
        `SELECT estado,
                (fecha_entrega::timestamp - make_interval(hours => $3)) > LOCALTIMESTAMP AS a_tiempo
         FROM pedido WHERE id_pedido = $1 AND id_cliente = $2
         FOR UPDATE`,
        [id, usuario.id_cliente, ANTICIPACION_ANULAR_HORAS]
      );
      const pedido = res.rows[0];
      if (!pedido) throw notFound('Pedido no encontrado');
      if (pedido.estado !== 'Pendiente') throw conflict('Solo puedes anular pedidos en estado Pendiente');
      if (!pedido.a_tiempo) {
        throw conflict(`Solo puedes anular hasta ${ANTICIPACION_ANULAR_HORAS} horas antes de la fecha de entrega`);
      }
      await this.#aplicarEstado(db, usuario, id, 'Anulado', `Anulado por el cliente: ${texto(motivo)}`);
    });
    return this.getById(id, { idCliente: usuario.id_cliente });
  }
}
