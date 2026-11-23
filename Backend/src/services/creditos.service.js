import { query } from '../config/db.js';
import { enTransaccion } from '../utils/transaccion.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { ABONO_DIAS_ATRAS_MAX } from '../config/negocio.js';
import { enteroPositivo, fechaValida, normalizarMedioPago, texto } from '../utils/normalizar.js';
import { NotificacionesService } from './notificaciones.service.js';

const SELECT_ABONO = `
  SELECT a.id_abono, a.id_credito, a.id_pedido, a.id_cliente, a.fecha_abono, a.fecha_registro,
         a.valor_abonado, a.saldo_pendiente, a.medio_pago, a.comprobante_url, a.estado,
         a.motivo_rechazo, a.motivo_anulacion, a.fecha_revision,
         a.id_usuario_registra, ur.nombre AS usuario_registra_nombre,
         a.id_usuario_revisa, uv.nombre AS usuario_revisa_nombre,
         c.nombre AS cliente_nombre, c.documento AS cliente_documento
  FROM abono a
  LEFT JOIN cliente c ON c.id_cliente = a.id_cliente
  LEFT JOIN usuario ur ON ur.id_usuario = a.id_usuario_registra
  LEFT JOIN usuario uv ON uv.id_usuario = a.id_usuario_revisa`;

const SELECT_CREDITO = `
  SELECT cr.*, p.estado AS pedido_estado, p.fecha_pedido, p.fecha_entrega,
         c.nombre AS cliente_nombre, c.documento AS cliente_documento,
         COALESCE((SELECT SUM(a.valor_abonado) FROM abono a
                   WHERE a.id_credito = cr.id_credito AND a.estado = 'En revisión'), 0) AS valor_en_revision
  FROM credito cr
  JOIN pedido p ON p.id_pedido = cr.id_pedido
  JOIN cliente c ON c.id_cliente = cr.id_cliente`;

/** PUT /abonos/:id: por qué no se edita un abono que ya salió de revisión (409). */
const ABONO_NO_EDITABLE = {
  Aprobado: 'El abono ya fue aprobado; anúlalo y registra uno nuevo.',
  Rechazado: 'El abono fue rechazado y no se puede editar; registra uno nuevo.',
  Anulado: 'El abono está anulado y no se puede editar; registra uno nuevo.',
};

const estadoPorSaldo =(saldo) => (Number(saldo) <= 0 ? 'Pagado' : 'Activo');

export class CreditosService {
  // ─── Núcleo (dentro de una transacción) ───

  static async #bloquearCredito(db, idCredito) {
    const res = await db.query('SELECT * FROM credito WHERE id_credito = $1 FOR UPDATE', [idCredito]);
    if (res.rows.length === 0) throw notFound('Crédito no encontrado');
    return res.rows[0];
  }

  /**
   * Crea el crédito de un pedido. Si el pedido ya tenía abonos aprobados sin
   * crédito (datos anteriores a esta versión), se vinculan y se descuentan.
   */
  static async crearParaPedido(db, pedido) {
    const existente = await db.query('SELECT * FROM credito WHERE id_pedido = $1 FOR UPDATE', [pedido.id_pedido]);
    if (existente.rows.length > 0) return existente.rows[0];

    const previos = await db.query(
      `SELECT COALESCE(SUM(valor_abonado), 0)::numeric AS total
       FROM abono WHERE id_pedido = $1 AND id_credito IS NULL AND estado = 'Aprobado'`,
      [pedido.id_pedido]
    );
    const abonado = Math.min(Number(previos.rows[0].total), Number(pedido.valor_total));
    const saldo = Number(pedido.valor_total) - abonado;
    const res = await db.query(
      `INSERT INTO credito (id_pedido, id_cliente, valor_total, valor_abonado, saldo_pendiente, estado)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [pedido.id_pedido, pedido.id_cliente, pedido.valor_total, abonado, saldo, estadoPorSaldo(saldo)]
    );
    await db.query(
      `UPDATE abono SET id_credito = $1 WHERE id_pedido = $2 AND id_credito IS NULL`,
      [res.rows[0].id_credito, pedido.id_pedido]
    );
    return res.rows[0];
  }

  /**
   * Suma de abonos en revisión: el nuevo abono no puede superar saldo − pendientes.
   * Al editar, [excluirAbono] deja fuera el abono que se corrige.
   */
  static async #enRevision(db, idCredito, excluirAbono = null) {
    const res = await db.query(
      `SELECT COALESCE(SUM(valor_abonado), 0)::numeric AS total
       FROM abono WHERE id_credito = $1 AND estado = 'En revisión'
         AND ($2::int IS NULL OR id_abono <> $2)`,
      [idCredito, excluirAbono]
    );
    return Number(res.rows[0].total);
  }

  /** Reglas comunes al registrar y al editar: crédito activo, saldo disponible y comprobante. */
  static async #validarAbono(db, credito, { valor, medioPago, comprobanteUrl, excluirAbono = null }) {
    if (credito.estado !== 'Activo') {
      throw conflict(credito.estado === 'Pagado' ? 'El crédito ya está pagado' : 'El crédito está anulado');
    }
    const disponible = Number(credito.saldo_pendiente) - (await this.#enRevision(db, credito.id_credito, excluirAbono));
    if (valor > disponible) {
      const mensaje = disponible <= 0
        ? 'El saldo pendiente ya está cubierto por abonos en revisión'
        : `El abono no puede superar el saldo pendiente (${disponible})`;
      throw badRequest(mensaje, { valor_abonado: mensaje });
    }
    if (medioPago === 'Transferencia' && !comprobanteUrl) {
      const mensaje = 'Para pagos por transferencia debes adjuntar el comprobante';
      throw badRequest(mensaje, { comprobante_url: mensaje });
    }
  }

  /**
   * Inserta un abono. estado 'Aprobado' (personal) actualiza el saldo al
   * momento; 'En revisión' (cliente) espera la aprobación (CA-167-003).
   */
  static async #insertarAbono(db, credito, { valor, medioPago, comprobanteUrl, estado, idUsuario, fechaAbono = null }) {
    await this.#validarAbono(db, credito, { valor, medioPago, comprobanteUrl });

    const aprobado = estado === 'Aprobado';
    const saldoNuevo = Number(credito.saldo_pendiente) - valor;
    const res = await db.query(
      `INSERT INTO abono (id_cliente, id_pedido, id_credito, valor_abonado, saldo_pendiente, medio_pago,
                          comprobante_url, estado, id_usuario_registra, id_usuario_revisa, fecha_revision,
                          fecha_abono)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12::date, CURRENT_DATE))
       RETURNING id_abono`,
      [credito.id_cliente, credito.id_pedido, credito.id_credito, valor, Math.max(saldoNuevo, 0), medioPago,
        comprobanteUrl, estado, idUsuario, aprobado ? idUsuario : null, aprobado ? new Date() : null,
        fechaAbono]
    );
    if (aprobado) {
      await db.query(
        `UPDATE credito SET valor_abonado = valor_abonado + $1, saldo_pendiente = $2, estado = $3
         WHERE id_credito = $4`,
        [valor, saldoNuevo, estadoPorSaldo(saldoNuevo), credito.id_credito]
      );
    }
    return res.rows[0].id_abono;
  }

  /** Abono inicial del checkout (HU-161): queda en revisión. */
  static async abonoInicial(db, pedido, { valor, medioPago, comprobanteUrl, idUsuario }) {
    const credito = await this.crearParaPedido(db, pedido);
    const idAbono = await this.#insertarAbono(db, credito, {
      valor, medioPago, comprobanteUrl, estado: 'En revisión', idUsuario,
    });
    return { credito, idAbono };
  }

  // ─── Personal (HU-117, HU-171) ───

  /**
   * Fecha del abono que registra el personal (e). Sin fecha → hoy. No puede
   * ser futura, ni anterior a la fecha del pedido, ni de hace más de
   * ABONO_DIAS_ATRAS_MAX días. Se valida con el reloj de la base (hora de
   * Colombia) y antes de tocar el crédito.
   */
  static async #fechaAbono(db, valor, pedido) {
    if (valor === undefined || valor === null || texto(valor) === '') return null;
    const fecha = fechaValida(valor);
    const error = (mensaje) => badRequest(mensaje, { fecha_abono: mensaje });
    if (!fecha) throw error('La fecha del abono no es válida (AAAA-MM-DD)');
    const res = await db.query(
      `SELECT $1::date > CURRENT_DATE AS futura,
              $1::date < $3::date AS antes_pedido,
              $1::date < CURRENT_DATE - $2::int AS antigua,
              to_char($3::date, 'DD/MM/YYYY') AS fecha_pedido,
              to_char(CURRENT_DATE - $2::int, 'DD/MM/YYYY') AS limite`,
      [fecha, ABONO_DIAS_ATRAS_MAX, pedido.fecha_pedido]
    );
    const r = res.rows[0];
    if (r.futura) throw error('La fecha del abono no puede ser futura');
    if (r.antes_pedido) throw error(`La fecha del abono no puede ser anterior a la fecha del pedido (${r.fecha_pedido})`);
    if (r.antigua) {
      throw error(`La fecha del abono no puede ser de hace más de ${ABONO_DIAS_ATRAS_MAX} días (la más antigua permitida es el ${r.limite})`);
    }
    return fecha;
  }

  /** El personal registra un abono a un pedido; queda aprobado de inmediato. */
  static async registrarPorPersonal(usuario, datos) {
    const idPedido = enteroPositivo(datos.id_pedido, 'id_pedido');
    const valor = enteroPositivo(datos.valor_abonado ?? datos.valor, 'El valor del abono');
    const medioPago = normalizarMedioPago(datos.medio_pago, { requerido: true });
    const comprobanteUrl = texto(datos.comprobante_url) || null;

    const idAbono = await enTransaccion(async (db) => {
      const pedido = await db.query('SELECT * FROM pedido WHERE id_pedido = $1 FOR UPDATE', [idPedido]);
      if (pedido.rows.length === 0) throw notFound('Pedido no encontrado');
      if (pedido.rows[0].estado === 'Anulado') throw conflict('No se pueden registrar abonos a un pedido anulado');
      const fechaAbono = await this.#fechaAbono(db, datos.fecha_abono, pedido.rows[0]);
      const credito = await this.crearParaPedido(db, pedido.rows[0]);
      const bloqueado = await this.#bloquearCredito(db, credito.id_credito);
      return this.#insertarAbono(db, bloqueado, {
        valor, medioPago, comprobanteUrl, estado: 'Aprobado', idUsuario: usuario.id_usuario, fechaAbono,
      });
    });
    return this.obtenerAbono(idAbono);
  }

  /**
   * Corrige un abono En revisión: valor, medio de pago, fecha o comprobante
   * (los campos que no llegan se conservan). Mismas reglas del registro,
   * incluida la fecha (#fechaAbono). Aprobado, Rechazado o Anulado → 409: el
   * abono no se edita, se anula y se registra otro.
   */
  static async editar(idAbono, datos) {
    const valorEnviado = datos.valor_abonado ?? datos.valor;
    const valor = valorEnviado === undefined ? null : enteroPositivo(valorEnviado, 'El valor del abono');
    const medioPago = datos.medio_pago === undefined ? null : normalizarMedioPago(datos.medio_pago, { requerido: true });

    await enTransaccion(async (db) => {
      const res = await db.query('SELECT * FROM abono WHERE id_abono = $1 FOR UPDATE', [idAbono]);
      const abono = res.rows[0];
      if (!abono) throw notFound('Abono no encontrado');
      if (abono.estado !== 'En revisión') throw conflict(ABONO_NO_EDITABLE[abono.estado] ?? `El abono ya está ${abono.estado.toLowerCase()}`);

      const pedido = await db.query('SELECT * FROM pedido WHERE id_pedido = $1', [abono.id_pedido]);
      const fechaAbono = await this.#fechaAbono(db, datos.fecha_abono, pedido.rows[0]);
      const credito = await this.#bloquearCredito(db, abono.id_credito);
      const nuevo = {
        valor: valor ?? Number(abono.valor_abonado),
        medioPago: medioPago ?? abono.medio_pago,
        comprobanteUrl: datos.comprobante_url === undefined ? abono.comprobante_url : datos.comprobante_url,
      };
      await this.#validarAbono(db, credito, { ...nuevo, excluirAbono: abono.id_abono });

      await db.query(
        `UPDATE abono
         SET valor_abonado = $1, medio_pago = $2, comprobante_url = $3,
             fecha_abono = COALESCE($4::date, fecha_abono), saldo_pendiente = $5
         WHERE id_abono = $6`,
        [nuevo.valor, nuevo.medioPago, nuevo.comprobanteUrl, fechaAbono,
          Math.max(Number(credito.saldo_pendiente) - nuevo.valor, 0), abono.id_abono]
      );
    });
    return this.obtenerAbono(idAbono);
  }

  static async aprobar(usuario, idAbono) {
    return this.#revisar(usuario, idAbono, 'Aprobado');
  }

  static async rechazar(usuario, idAbono, motivo) {
    if (texto(motivo).length < 3) throw badRequest('Indica el motivo del rechazo');
    return this.#revisar(usuario, idAbono, 'Rechazado', texto(motivo));
  }

  static async #revisar(usuario, idAbono, nuevoEstado, motivo = null) {
    await enTransaccion(async (db) => {
      const res = await db.query('SELECT * FROM abono WHERE id_abono = $1 FOR UPDATE', [idAbono]);
      const abono = res.rows[0];
      if (!abono) throw notFound('Abono no encontrado');
      if (abono.estado !== 'En revisión') throw conflict(`El abono ya está ${abono.estado.toLowerCase()}`);

      const credito = await this.#bloquearCredito(db, abono.id_credito);
      let saldo = Number(credito.saldo_pendiente);
      if (nuevoEstado === 'Aprobado') {
        if (credito.estado !== 'Activo') throw conflict('El crédito no está activo');
        if (Number(abono.valor_abonado) > saldo) {
          throw conflict('El abono supera el saldo pendiente actual; recházalo con ese motivo');
        }
        saldo -= Number(abono.valor_abonado);
        await db.query(
          `UPDATE credito SET valor_abonado = valor_abonado + $1, saldo_pendiente = $2, estado = $3
           WHERE id_credito = $4`,
          [abono.valor_abonado, saldo, estadoPorSaldo(saldo), credito.id_credito]
        );
      }
      const actualizado = await db.query(
        `UPDATE abono
         SET estado = $1, motivo_rechazo = $2, id_usuario_revisa = $3, fecha_revision = NOW(),
             saldo_pendiente = $4
         WHERE id_abono = $5
         RETURNING *`,
        [nuevoEstado, motivo, usuario.id_usuario, saldo, idAbono]
      );
      await NotificacionesService.abonoRevisado(db, actualizado.rows[0], saldo);
    });
    return this.obtenerAbono(idAbono);
  }

  /** Anula un abono (nunca se elimina). Si estaba aprobado, devuelve el valor al saldo. */
  static async anular(usuario, idAbono, motivo) {
    if (texto(motivo).length < 3) throw badRequest('Indica el motivo de la anulación');
    await enTransaccion(async (db) => {
      const res = await db.query('SELECT * FROM abono WHERE id_abono = $1 FOR UPDATE', [idAbono]);
      const abono = res.rows[0];
      if (!abono) throw notFound('Abono no encontrado');
      if (!['Aprobado', 'En revisión'].includes(abono.estado)) {
        throw conflict(`El abono ya está ${abono.estado.toLowerCase()}`);
      }
      if (abono.estado === 'Aprobado' && abono.id_credito) {
        const credito = await this.#bloquearCredito(db, abono.id_credito);
        const saldo = Number(credito.saldo_pendiente) + Number(abono.valor_abonado);
        await db.query(
          `UPDATE credito SET valor_abonado = GREATEST(valor_abonado - $1, 0), saldo_pendiente = $2,
                  estado = CASE WHEN estado = 'Anulado' THEN estado ELSE $3 END
           WHERE id_credito = $4`,
          [abono.valor_abonado, saldo, estadoPorSaldo(saldo), credito.id_credito]
        );
      }
      await db.query(
        `UPDATE abono SET estado = 'Anulado', motivo_anulacion = $1, id_usuario_revisa = $2, fecha_revision = NOW()
         WHERE id_abono = $3`,
        [texto(motivo), usuario.id_usuario, idAbono]
      );
    });
    return this.obtenerAbono(idAbono);
  }

  /** Al anular un pedido: crédito anulado y abonos en revisión rechazados. */
  static async anularDePedido(db, idPedido, motivo) {
    await db.query(`UPDATE credito SET estado = 'Anulado' WHERE id_pedido = $1`, [idPedido]);
    await db.query(
      `UPDATE abono SET estado = 'Rechazado', motivo_rechazo = $1, fecha_revision = NOW()
       WHERE id_pedido = $2 AND estado = 'En revisión'`,
      [`Pedido anulado: ${motivo}`, idPedido]
    );
  }

  static async obtenerAbono(idAbono) {
    const res = await query(`${SELECT_ABONO} WHERE a.id_abono = $1`, [idAbono]);
    return res.rows[0] || null;
  }

  /** Filtros opcionales; desde y hasta ("AAAA-MM-DD", incluidas) van sobre fecha_abono. */
  static async listarAbonos({ estado, idPedido, idCredito, idCliente, desde, hasta } = {}) {
    const res = await query(
      `${SELECT_ABONO}
       WHERE ($1::text IS NULL OR a.estado = $1)
         AND ($2::int IS NULL OR a.id_pedido = $2)
         AND ($3::int IS NULL OR a.id_credito = $3)
         AND ($4::int IS NULL OR a.id_cliente = $4)
         AND ($5::date IS NULL OR a.fecha_abono >= $5::date)
         AND ($6::date IS NULL OR a.fecha_abono <= $6::date)
       ORDER BY a.fecha_registro DESC, a.id_abono DESC`,
      [estado || null, idPedido || null, idCredito || null, idCliente || null, desde || null, hasta || null]
    );
    return res.rows;
  }

  static async listarCreditos({ estado, idCliente } = {}) {
    const res = await query(
      `${SELECT_CREDITO}
       WHERE ($1::text IS NULL OR cr.estado = $1) AND ($2::int IS NULL OR cr.id_cliente = $2)
       ORDER BY cr.fecha_creacion DESC`,
      [estado || null, idCliente || null]
    );
    return res.rows;
  }

  // ─── Cliente (HU-166, HU-167): siempre filtrado por el id_cliente del token ───

  static async creditosDeCliente(idCliente) {
    const creditos = await this.listarCreditos({ idCliente });
    const abonos = await query(
      `${SELECT_ABONO} WHERE a.id_cliente = $1 AND a.id_credito IS NOT NULL
       ORDER BY a.fecha_registro DESC, a.id_abono DESC`,
      [idCliente]
    );
    return creditos.map((credito) => ({
      ...credito,
      abonos: abonos.rows.filter((a) => a.id_credito === credito.id_credito),
    }));
  }

  static async creditoDeCliente(idCliente, idCredito) {
    const credito = (await this.creditosDeCliente(idCliente)).find((c) => c.id_credito === Number(idCredito));
    if (!credito) throw notFound('Crédito no encontrado');
    return credito;
  }

  static async registrarPorCliente(usuario, idCredito, datos, comprobanteUrl) {
    const valor = enteroPositivo(datos.valor_abonado ?? datos.valor, 'El valor del abono');
    const medioPago = normalizarMedioPago(datos.medio_pago, { requerido: true });

    const idAbono = await enTransaccion(async (db) => {
      const credito = await this.#bloquearCredito(db, idCredito);
      if (credito.id_cliente !== usuario.id_cliente) throw notFound('Crédito no encontrado');
      return this.#insertarAbono(db, credito, {
        valor, medioPago, comprobanteUrl, estado: 'En revisión', idUsuario: usuario.id_usuario,
      });
    });
    return this.obtenerAbono(idAbono);
  }
}
