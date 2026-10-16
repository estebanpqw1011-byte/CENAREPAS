import { query } from '../config/db.js';

export class AuditoriaService {
  static async getAll() {
    const res = await query(`
      SELECT a.*, u.nombre AS usuario_nombre, u.correo AS usuario_correo
      FROM auditoria a
      LEFT JOIN usuario u ON a.id_usuario = u.id_usuario
      ORDER BY a.id_auditoria DESC
      LIMIT 100
    `);
    return res.rows || [];
  }

  static async registrar(id_usuario, tabla_afectada, id_registro_afectado, accion, detalle) {
    try {
      await query(
        `INSERT INTO auditoria (id_usuario, tabla_afectada, id_registro_afectado, accion, detalle)
         VALUES ($1, $2, $3, $4, $5)`,
        [id_usuario, tabla_afectada, id_registro_afectado, accion, detalle]
      );
    } catch (e) {
      // No interrumpe la operación auditada, pero deja constancia del fallo.
      console.error('[AuditoriaService.registrar] No se pudo registrar la auditoría:', e.message);
    }
  }
}
