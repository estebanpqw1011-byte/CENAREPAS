import { pool } from '../config/db.js';

const loteWithInsumosQuery = `
  SELECT lp.*, f.nombre AS ficha_nombre, u.nombre AS responsable_nombre,
         COALESCE(
           json_agg(
             json_build_object(
               'id_lote_insumo', lpi.id_lote_insumo,
               'id_insumo', lpi.id_insumo,
               'insumo_nombre', i.nombre,
               'unidad_medida', i.unidad_medida,
               'cantidad_consumida', lpi.cantidad_consumida
             )
           ) FILTER (WHERE lpi.id_lote_insumo IS NOT NULL),
           '[]'
         ) AS insumos_consumidos
  FROM lote_produccion lp
  LEFT JOIN ficha_tecnica f ON lp.id_ficha = f.id_ficha
  LEFT JOIN usuario u ON lp.id_usuario_responsable = u.id_usuario
  LEFT JOIN lote_produccion_insumo lpi ON lp.id_lote = lpi.id_lote
  LEFT JOIN insumo i ON lpi.id_insumo = i.id_insumo`;

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeProducedQuantity = (value) => {
  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw createError('La cantidad producida debe ser un número entero mayor que 0', 400);
  }
  return quantity;
};

const normalizeConsumedInsumos = (insumos) => {
  if (!Array.isArray(insumos)) {
    throw createError('La lista de insumos consumidos no es válida', 400);
  }

  const amountsById = new Map();
  for (const item of insumos) {
    if (!item || typeof item !== 'object') {
      throw createError('Cada insumo consumido debe ser un objeto válido', 400);
    }

    const idInsumo = Number(item.id_insumo);
    const amount = Number(item.cantidad_consumida ?? item.cantidad);
    const amountInCents = Math.round(amount * 100);
    if (!Number.isSafeInteger(idInsumo) || idInsumo <= 0 ||
        !Number.isFinite(amount) || amount <= 0 ||
        !Number.isSafeInteger(amountInCents) ||
        Math.abs(amount * 100 - amountInCents) > 1e-7) {
      throw createError('Cada insumo debe tener un identificador y una cantidad válida de hasta 2 decimales', 400);
    }

    const totalAmountInCents = (amountsById.get(idInsumo) || 0) + amountInCents;
    if (!Number.isSafeInteger(totalAmountInCents)) {
      throw createError('La cantidad total de un insumo es demasiado grande', 400);
    }
    amountsById.set(idInsumo, totalAmountInCents);
  }

  return new Map([...amountsById.entries()].sort(([a], [b]) => a - b));
};

const lockFichasAndProductos = async (client, fichaIds) => {
  const uniqueFichaIds = [...new Set(fichaIds)].sort((a, b) => a - b);
  const fichasResult = await client.query(
    'SELECT id_ficha FROM ficha_tecnica WHERE id_ficha = ANY($1::int[]) ORDER BY id_ficha FOR UPDATE',
    [uniqueFichaIds]
  );
  const existingFichaIds = new Set(fichasResult.rows.map((row) => Number(row.id_ficha)));
  for (const idFicha of uniqueFichaIds) {
    if (!existingFichaIds.has(idFicha)) {
      throw createError('La ficha técnica seleccionada no existe', 404);
    }
  }

  const productsResult = await client.query(
    'SELECT id_producto, id_ficha, stock_actual FROM producto WHERE id_ficha = ANY($1::int[]) ORDER BY id_producto FOR UPDATE',
    [uniqueFichaIds]
  );
  const productsByFicha = new Map(uniqueFichaIds.map((idFicha) => [idFicha, []]));
  for (const product of productsResult.rows) {
    productsByFicha.get(Number(product.id_ficha)).push(product);
  }

  for (const idFicha of uniqueFichaIds) {
    if (productsByFicha.get(idFicha).length !== 1) {
      throw createError(
        productsByFicha.get(idFicha).length === 0
          ? 'La ficha técnica debe estar asociada a un único producto para registrar producción'
          : 'La ficha técnica está asociada a varios productos; debe quedar asociada a uno solo para registrar producción',
        409
      );
    }
  }

  return productsByFicha;
};

const lockInsumos = async (client, insumoIds) => {
  if (insumoIds.length === 0) return new Map();

  const result = await client.query(
    'SELECT id_insumo, nombre, stock_actual FROM insumo WHERE id_insumo = ANY($1::int[]) ORDER BY id_insumo FOR UPDATE',
    [insumoIds]
  );
  const insumos = new Map(result.rows.map((row) => [Number(row.id_insumo), row]));
  for (const idInsumo of insumoIds) {
    if (!insumos.has(idInsumo)) {
      throw createError(`El insumo #${idInsumo} no existe`, 404);
    }
  }
  return insumos;
};

const getLoteInsumos = async (client, idLote) => {
  const result = await client.query(
    `SELECT id_insumo, SUM(cantidad_consumida) AS cantidad_consumida
     FROM lote_produccion_insumo
     WHERE id_lote = $1
     GROUP BY id_insumo
     ORDER BY id_insumo`,
    [idLote]
  );
  return new Map(result.rows.map((row) => [
    Number(row.id_insumo),
    Math.round(Number(row.cantidad_consumida) * 100),
  ]));
};

const areInsumosEqual = (first, second) =>
  first.size === second.size &&
  [...first.entries()].every(([idInsumo, amount]) => second.get(idInsumo) === amount);

const getLoteWithInsumos = async (client, id) => {
  const result = await client.query(
    `${loteWithInsumosQuery}
     WHERE lp.id_lote = $1
     GROUP BY lp.id_lote, f.nombre, u.nombre`,
    [id]
  );
  return result.rows[0] || null;
};

const replaceLoteInsumos = async (client, idLote, insumos) => {
  await client.query('DELETE FROM lote_produccion_insumo WHERE id_lote = $1', [idLote]);
  for (const [idInsumo, amountInCents] of insumos) {
    await client.query(
      `INSERT INTO lote_produccion_insumo (id_lote, id_insumo, cantidad_consumida)
       VALUES ($1, $2, $3)`,
      [idLote, idInsumo, amountInCents / 100]
    );
  }
};

export class ProduccionService {
  static async getAll() {
    const res = await pool.query(
      `${loteWithInsumosQuery}
       GROUP BY lp.id_lote, f.nombre, u.nombre
       ORDER BY lp.id_lote ASC`
    );
    return res.rows || [];
  }

  static async getById(id) {
    const res = await pool.query(
      `${loteWithInsumosQuery}
       WHERE lp.id_lote = $1
       GROUP BY lp.id_lote, f.nombre, u.nombre`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async create(data) {
    const {
      id_ficha,
      id_usuario_responsable,
      fecha_produccion = new Date(),
      cantidad_producida,
      estado = 'En proceso',
      observaciones,
    } = data;
    if (String(estado).toLowerCase() === 'anulado') {
      throw createError('Use la acción de anulación para registrar un lote anulado', 400);
    }
    const idFicha = Number(id_ficha);
    const idUsuarioResponsable = Number(id_usuario_responsable);
    const producedQuantity = normalizeProducedQuantity(cantidad_producida);
    const consumedInsumos = normalizeConsumedInsumos(
      data.insumos === undefined ? [] : data.insumos
    );
    if (!Number.isSafeInteger(idFicha) || idFicha <= 0) {
      throw createError('La ficha técnica seleccionada no es válida', 400);
    }
    if (!Number.isSafeInteger(idUsuarioResponsable) || idUsuarioResponsable <= 0) {
      throw createError('El usuario responsable seleccionado no es válido', 400);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const productsByFicha = await lockFichasAndProductos(client, [idFicha]);
      const product = productsByFicha.get(idFicha)[0];
      const insumos = await lockInsumos(client, [...consumedInsumos.keys()]);

      for (const [idInsumo, amountInCents] of consumedInsumos) {
        const insumo = insumos.get(idInsumo);
        if (Number(insumo.stock_actual) < amountInCents / 100) {
          throw createError(`Stock insuficiente para el insumo "${insumo.nombre}"`, 409);
        }
        await client.query(
          'UPDATE insumo SET stock_actual = stock_actual - ($1::numeric / 100) WHERE id_insumo = $2',
          [amountInCents, idInsumo]
        );
      }

      const loteResult = await client.query(
        `INSERT INTO lote_produccion
           (id_ficha, id_usuario_responsable, fecha_produccion, cantidad_producida, estado, observaciones, inventario_aplicado)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         RETURNING *`,
        [idFicha, idUsuarioResponsable, fecha_produccion, producedQuantity, estado, observaciones]
      );
      const lote = loteResult.rows[0];
      await replaceLoteInsumos(client, lote.id_lote, consumedInsumos);
      await client.query(
        'UPDATE producto SET stock_actual = stock_actual + $1 WHERE id_producto = $2',
        [producedQuantity, product.id_producto]
      );

      const createdLote = await getLoteWithInsumos(client, lote.id_lote);
      await client.query('COMMIT');
      return createdLote;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id, data) {
    const hasInsumos = Object.prototype.hasOwnProperty.call(data, 'insumos');
    const nextInsumos = hasInsumos ? normalizeConsumedInsumos(data.insumos) : null;
    const nextProducedQuantity = data.cantidad_producida === undefined
      ? null
      : normalizeProducedQuantity(data.cantidad_producida);
    const requestedFichaId = data.id_ficha == null ? null : Number(data.id_ficha);
    const requestedUserId = data.id_usuario_responsable == null
      ? null
      : Number(data.id_usuario_responsable);
    if (requestedFichaId !== null && (!Number.isSafeInteger(requestedFichaId) || requestedFichaId <= 0)) {
      throw createError('La ficha técnica seleccionada no es válida', 400);
    }
    if (requestedUserId !== null && (!Number.isSafeInteger(requestedUserId) || requestedUserId <= 0)) {
      throw createError('El usuario responsable seleccionado no es válido', 400);
    }
    if (String(data.estado || '').toLowerCase() === 'anulado') {
      throw createError('Use la acción de anulación para revertir el inventario del lote', 400);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const loteResult = await client.query(
        'SELECT * FROM lote_produccion WHERE id_lote = $1 FOR UPDATE',
        [id]
      );
      const lote = loteResult.rows[0];
      if (!lote) throw createError('Lote de producción no encontrado', 404);
      if (String(lote.estado).toLowerCase() === 'anulado') {
        throw createError('No se puede editar un lote anulado', 409);
      }

      const oldFichaId = Number(lote.id_ficha);
      const newFichaId = requestedFichaId ?? oldFichaId;
      const oldProducedQuantity = Number(lote.cantidad_producida);
      const producedQuantity = nextProducedQuantity ?? oldProducedQuantity;
      const oldInsumos = await getLoteInsumos(client, id);
      const consumedInsumos = nextInsumos ?? oldInsumos;
      const inventoryChanged =
        newFichaId !== oldFichaId ||
        producedQuantity !== oldProducedQuantity ||
        !areInsumosEqual(consumedInsumos, oldInsumos);

      if (!lote.inventario_aplicado && inventoryChanged) {
        throw createError(
          'No se pueden cambiar ficha, cantidades o insumos de un lote histórico sin trazabilidad de inventario',
          409
        );
      }

      if (lote.inventario_aplicado) {
        const productsByFicha = await lockFichasAndProductos(client, [oldFichaId, newFichaId]);
        const oldProduct = productsByFicha.get(oldFichaId)[0];
        const newProduct = productsByFicha.get(newFichaId)[0];
        const allInsumoIds = [...new Set([...oldInsumos.keys(), ...consumedInsumos.keys()])]
          .sort((a, b) => a - b);
        const lockedInsumos = await lockInsumos(client, allInsumoIds);

        for (const idInsumo of allInsumoIds) {
          const consumptionDelta = (consumedInsumos.get(idInsumo) || 0) - (oldInsumos.get(idInsumo) || 0);
          if (consumptionDelta > 0) {
            const insumo = lockedInsumos.get(idInsumo);
            if (Number(insumo.stock_actual) < consumptionDelta / 100) {
              throw createError(`Stock insuficiente para el insumo "${insumo.nombre}"`, 409);
            }
          }
          if (consumptionDelta !== 0) {
            await client.query(
              'UPDATE insumo SET stock_actual = stock_actual - ($1::numeric / 100) WHERE id_insumo = $2',
              [consumptionDelta, idInsumo]
            );
          }
        }

        if (Number(oldProduct.id_producto) === Number(newProduct.id_producto)) {
          const productionDelta = producedQuantity - oldProducedQuantity;
          if (productionDelta > Number(oldProduct.stock_actual)) {
            throw createError('Stock insuficiente para ajustar la cantidad producida', 409);
          }
          if (productionDelta !== 0) {
            await client.query(
              'UPDATE producto SET stock_actual = stock_actual - $1 WHERE id_producto = $2',
              [productionDelta, oldProduct.id_producto]
            );
          }
        } else {
          if (Number(newProduct.stock_actual) < producedQuantity) {
            throw createError('Stock insuficiente en el nuevo producto para cambiar la ficha técnica', 409);
          }
          await client.query(
            'UPDATE producto SET stock_actual = stock_actual + $1 WHERE id_producto = $2',
            [oldProducedQuantity, oldProduct.id_producto]
          );
          await client.query(
            'UPDATE producto SET stock_actual = stock_actual - $1 WHERE id_producto = $2',
            [producedQuantity, newProduct.id_producto]
          );
        }
      }

      const updatedResult = await client.query(
        `UPDATE lote_produccion
         SET id_ficha = $1,
             id_usuario_responsable = COALESCE($2, id_usuario_responsable),
             fecha_produccion = COALESCE($3, fecha_produccion),
             cantidad_producida = $4,
             estado = COALESCE($5, estado),
             observaciones = CASE WHEN $6 THEN $7 ELSE observaciones END
         WHERE id_lote = $8
         RETURNING id_lote`,
        [
          newFichaId,
          requestedUserId,
          data.fecha_produccion ?? null,
          producedQuantity,
          data.estado ?? null,
          Object.prototype.hasOwnProperty.call(data, 'observaciones'),
          data.observaciones ?? null,
          id,
        ]
      );
      if (hasInsumos && lote.inventario_aplicado) {
        await replaceLoteInsumos(client, id, consumedInsumos);
      }

      const updatedLote = await getLoteWithInsumos(client, updatedResult.rows[0].id_lote);
      await client.query('COMMIT');
      return updatedLote;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async anular(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const loteResult = await client.query(
        'SELECT * FROM lote_produccion WHERE id_lote = $1 FOR UPDATE',
        [id]
      );
      const lote = loteResult.rows[0];
      if (!lote) throw createError('Lote de producción no encontrado', 404);
      if (String(lote.estado).toLowerCase() === 'anulado') {
        const alreadyCancelled = await getLoteWithInsumos(client, id);
        await client.query('COMMIT');
        return alreadyCancelled;
      }

      if (lote.inventario_aplicado) {
        const idFicha = Number(lote.id_ficha);
        const productsByFicha = await lockFichasAndProductos(client, [idFicha]);
        const product = productsByFicha.get(idFicha)[0];
        const insumos = await getLoteInsumos(client, id);
        const lockedInsumos = await lockInsumos(client, [...insumos.keys()]);
        const producedQuantity = Number(lote.cantidad_producida);
        if (Number(product.stock_actual) < producedQuantity) {
          throw createError(
            'No se puede anular el lote: el stock del producto es menor que lo producido por este lote',
            409
          );
        }

        for (const [idInsumo, amountInCents] of insumos) {
          if (!lockedInsumos.has(idInsumo)) {
            throw createError(`El insumo #${idInsumo} no existe`, 404);
          }
          await client.query(
            'UPDATE insumo SET stock_actual = stock_actual + ($1::numeric / 100) WHERE id_insumo = $2',
            [amountInCents, idInsumo]
          );
        }
        await client.query(
          'UPDATE producto SET stock_actual = stock_actual - $1 WHERE id_producto = $2',
          [producedQuantity, product.id_producto]
        );
      }
      await client.query(
        "UPDATE lote_produccion SET estado = 'anulado' WHERE id_lote = $1",
        [id]
      );

      const cancelledLote = await getLoteWithInsumos(client, id);
      await client.query('COMMIT');
      return cancelledLote;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    return ProduccionService.anular(id);
  }
}
