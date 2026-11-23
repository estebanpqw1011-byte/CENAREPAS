import { query } from '../config/db.js';
import { notFound } from '../utils/httpError.js';

const pesos = (valor) => `$${Math.round(Number(valor) || 0).toLocaleString('es-CO')}`;

/**
 * Notificaciones del cliente (HU-168, HU-169). Solo se notifica a clientes con
 * cuenta (cliente.id_usuario); los clientes creados por el personal no reciben.
 * Las funciones de envío reciben el `client` de la transacción en curso.
 */
export class NotificacionesService {
  static async #usuarioDelPedido(db, idPedido) {
    const res = await db.query(
      `SELECT c.id_usuario FROM pedido p JOIN cliente c ON c.id_cliente = p.id_cliente WHERE p.id_pedido = $1`,
      [idPedido]
    );
    return res.rows[0]?.id_usuario || null;
  }

  static async #crear(db, { idUsuario, idPedido = null, idAbono = null, tipo, titulo, mensaje }) {
    if (!idUsuario) return null;
    const res = await db.query(
      `INSERT INTO notificacion (id_usuario, id_pedido, id_abono, tipo, titulo, mensaje)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [idUsuario, idPedido, idAbono, tipo, titulo, mensaje]
    );
    return res.rows[0];
  }

  /** CA-168-001: número, total y saldo pendiente si aplica. */
  static async pedidoCreado(db, pedido, saldoPendiente = 0) {
    const saldo = Number(saldoPendiente) > 0 ? ` Saldo pendiente: ${pesos(saldoPendiente)}.` : '';
    return this.#crear(db, {
      idUsuario: await this.#usuarioDelPedido(db, pedido.id_pedido),
      idPedido: pedido.id_pedido,
      tipo: 'pedido_creado',
      titulo: `Recibimos tu pedido #${pedido.id_pedido}`,
      mensaje: `Tu pedido por ${pesos(pedido.valor_total)} quedó en estado Pendiente.${saldo}`,
    });
  }

  /** CA-168-002: cambio de estado del pedido. */
  static async pedidoEstado(db, pedido, motivo = null) {
    const detalle = pedido.estado === 'Anulado' && motivo ? ` Motivo: ${motivo}.` : '';
    return this.#crear(db, {
      idUsuario: await this.#usuarioDelPedido(db, pedido.id_pedido),
      idPedido: pedido.id_pedido,
      tipo: 'pedido_estado',
      titulo: `Pedido #${pedido.id_pedido}: ${pedido.estado}`,
      mensaje: `Tu pedido #${pedido.id_pedido} cambió a ${pedido.estado}.${detalle}`,
    });
  }

  static async abonoRevisado(db, abono, saldoPendiente) {
    const aprobado = abono.estado === 'Aprobado';
    return this.#crear(db, {
      idUsuario: await this.#usuarioDelPedido(db, abono.id_pedido),
      idPedido: abono.id_pedido,
      idAbono: abono.id_abono,
      tipo: aprobado ? 'abono_aprobado' : 'abono_rechazado',
      titulo: aprobado ? 'Abono aprobado' : 'Abono rechazado',
      mensaje: aprobado
        ? `Aprobamos tu abono de ${pesos(abono.valor_abonado)} al pedido #${abono.id_pedido}. Saldo pendiente: ${pesos(saldoPendiente)}.`
        : `Tu abono de ${pesos(abono.valor_abonado)} al pedido #${abono.id_pedido} fue rechazado. Motivo: ${abono.motivo_rechazo}.`,
    });
  }

  // ─── Consulta del cliente (siempre filtrada por el usuario del token) ───

  static async listar(idUsuario) {
    const res = await query(
      `SELECT id_notificacion, id_pedido, id_abono, tipo, titulo, mensaje, leida, fecha_creacion, fecha_lectura
       FROM notificacion
       WHERE id_usuario = $1
       ORDER BY fecha_creacion DESC, id_notificacion DESC
       LIMIT 100`,
      [idUsuario]
    );
    const noLeidas = res.rows.filter((n) => !n.leida).length;
    return { no_leidas: noLeidas, notificaciones: res.rows };
  }

  static async marcarLeida(idUsuario, idNotificacion) {
    const res = await query(
      `UPDATE notificacion
       SET leida = TRUE, fecha_lectura = COALESCE(fecha_lectura, NOW())
       WHERE id_notificacion = $1 AND id_usuario = $2
       RETURNING id_notificacion, id_pedido, id_abono, tipo, titulo, mensaje, leida, fecha_creacion, fecha_lectura`,
      [idNotificacion, idUsuario]
    );
    if (res.rows.length === 0) throw notFound('Notificación no encontrada');
    return res.rows[0];
  }

  static async marcarTodasLeidas(idUsuario) {
    const res = await query(
      `UPDATE notificacion SET leida = TRUE, fecha_lectura = NOW()
       WHERE id_usuario = $1 AND leida = FALSE`,
      [idUsuario]
    );
    return { actualizadas: res.rowCount };
  }
}
