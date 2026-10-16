import { pool, query } from '../config/db.js';
import { conflict, notFound } from '../utils/httpError.js';

const ROLES_SISTEMA = ['Administrador', 'Secretaria', 'Vendedor', 'Cliente'];

export class RolesService {
  static async getAll() {
    const res = await query(`
      SELECT r.*, 
             COALESCE(json_agg(p.id_permiso ORDER BY p.id_permiso) FILTER (WHERE p.id_permiso IS NOT NULL), '[]') AS permisos
      FROM rol r
      LEFT JOIN rol_permiso rp ON r.id_rol = rp.id_rol
      LEFT JOIN permiso p ON rp.id_permiso = p.id_permiso
      GROUP BY r.id_rol
      ORDER BY r.id_rol ASC
    `);
    if (res.rows && res.rows.length > 0) return res.rows;
    return [];
  }

  static async getById(id) {
    const res = await query(`
      SELECT r.*, 
             COALESCE(json_agg(p.id_permiso ORDER BY p.id_permiso) FILTER (WHERE p.id_permiso IS NOT NULL), '[]') AS permisos
      FROM rol r
      LEFT JOIN rol_permiso rp ON r.id_rol = rp.id_rol
      LEFT JOIN permiso p ON rp.id_permiso = p.id_permiso
      WHERE r.id_rol = $1
      GROUP BY r.id_rol
    `, [id]);
    return res.rows[0] || null;
  }

  static async create(data) {
    const { nombre, descripcion, estado = 'Activo', permisos = [] } = data;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const res = await client.query(
        `INSERT INTO rol (nombre, descripcion, estado)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [nombre, descripcion, estado]
      );
      const newRol = res.rows[0];

      const cleanPermisos = Array.isArray(permisos)
        ? [...new Set(permisos.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
        : [];

      if (cleanPermisos.length > 0) {
        await client.query(
          `INSERT INTO rol_permiso (id_rol, id_permiso)
           SELECT $1, p.id_permiso
           FROM permiso p
           WHERE p.id_permiso = ANY($2::int[])
           ON CONFLICT DO NOTHING`,
          [newRol.id_rol, cleanPermisos]
        );
      }

      await client.query('COMMIT');
      newRol.permisos = cleanPermisos;
      return newRol;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[RolesService.create] Error en transacción:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id, data) {
    const { nombre, descripcion, estado, permisos } = data;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const res = await client.query(
        `UPDATE rol 
         SET nombre = COALESCE($1, nombre),
             descripcion = COALESCE($2, descripcion),
             estado = COALESCE($3, estado)
         WHERE id_rol = $4
         RETURNING *`,
        [nombre, descripcion, estado, id]
      );
      const updatedRol = res.rows[0];
      if (!updatedRol) throw notFound('Rol no encontrado');

      if (Array.isArray(permisos)) {
        const cleanPermisos = [...new Set(permisos.map(Number).filter((pId) => Number.isInteger(pId) && pId > 0))];

        // Sincronización completa: eliminar permisos existentes e insertar la nueva selección
        await client.query('DELETE FROM rol_permiso WHERE id_rol = $1', [id]);

        if (cleanPermisos.length > 0) {
          await client.query(
            `INSERT INTO rol_permiso (id_rol, id_permiso)
             SELECT $1, p.id_permiso
             FROM permiso p
             WHERE p.id_permiso = ANY($2::int[])
             ON CONFLICT DO NOTHING`,
            [id, cleanPermisos]
          );
        }
        updatedRol.permisos = cleanPermisos;
      }

      await client.query('COMMIT');
      return updatedRol;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[RolesService.update] Error en transacción:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // HU-010: solo se elimina un rol sin usuarios; los roles del sistema no se eliminan.
      const rol = await client.query('SELECT nombre FROM rol WHERE id_rol = $1', [id]);
      if (rol.rows.length === 0) throw notFound('Rol no encontrado');
      if (ROLES_SISTEMA.includes(rol.rows[0].nombre)) {
        throw conflict(`El rol ${rol.rows[0].nombre} es del sistema y no se puede eliminar`);
      }
      const usuarios = await client.query('SELECT COUNT(*)::int AS total FROM usuario WHERE id_rol = $1', [id]);
      if (usuarios.rows[0].total > 0) {
        throw conflict('No se puede eliminar un rol con usuarios asignados; inactívalo en su lugar');
      }
      await client.query('DELETE FROM rol_permiso WHERE id_rol = $1', [id]);
      await client.query('DELETE FROM rol WHERE id_rol = $1', [id]);
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[RolesService.delete] Error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}
