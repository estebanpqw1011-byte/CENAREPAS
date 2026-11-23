import { query } from '../config/db.js';
import { notFound } from '../utils/httpError.js';

export class SedesService {
  static async getAll() {
    const res = await query('SELECT * FROM sede ORDER BY id_sede ASC');
    return res.rows || [];
  }

  static async getById(id) {
    const res = await query('SELECT * FROM sede WHERE id_sede = $1', [id]);
    return res.rows[0] || null;
  }

  static async create(data) {
    const { nombre, direccion, telefono, horario_atencion, responsable, estado = 'Activo' } = data;
    const res = await query(
      `INSERT INTO sede (nombre, direccion, telefono, horario_atencion, responsable, estado)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [nombre, direccion, telefono, horario_atencion, responsable, estado]
    );
    return res.rows[0];
  }

  static async update(id, data) {
    const { nombre, direccion, telefono, horario_atencion, responsable, estado } = data;
    const res = await query(
      `UPDATE sede 
       SET nombre = COALESCE($1, nombre),
           direccion = COALESCE($2, direccion),
           telefono = COALESCE($3, telefono),
           horario_atencion = COALESCE($4, horario_atencion),
           responsable = COALESCE($5, responsable),
           estado = COALESCE($6, estado)
       WHERE id_sede = $7
       RETURNING *`,
      [nombre, direccion, telefono, horario_atencion, responsable, estado, id]
    );
    if (!res.rows[0]) throw notFound('Sede no encontrada');
    return res.rows[0];
  }

  /** Inactiva el registro (sin borrado físico: conserva el historial). */
  static async delete(id) {
    const res = await query(
      `UPDATE sede SET estado = 'Inactivo' WHERE id_sede = $1 RETURNING id_sede`,
      [id]
    );
    return res.rows.length > 0;
  }
}
