// rolesService.js - Servicio para la gestión de roles en Masarepas
import { api } from '../../../shared/services/api.js';

export let mockRoles = [];

export const getRoles = async () => {
  return api.get('/roles');
};

export const createRol = async (rol) => {
  return api.post('/roles', rol);
};

export const updateRol = async (id_rol, rol) => {
  return api.put(`/roles/${id_rol}`, rol);
};

export const deleteRol = async (id) => {
  return api.delete(`/roles/${id}`);
};

/** Activa o inactiva (PATCH /roles/:id/estado); devuelve el registro actualizado. */
export const cambiarEstadoRol = async (id, estado) => {
  return api.patch(`/roles/${id}/estado`, { estado });
};
