// usuariosService.js - Servicio para la gestión de usuarios en Masarepas
import { api } from '../../../shared/services/api.js';

export let mockUsuarios = [];

export const getUsuarios = async () => {
  return api.get('/usuarios');
};

export const createUsuario = async (usuario) => {
  return api.post('/usuarios', usuario);
};

export const updateUsuario = async (id_usuario, usuario) => {
  return api.put(`/usuarios/${id_usuario}`, usuario);
};

export const deleteUsuario = async (id_usuario) => {
  return api.delete(`/usuarios/${id_usuario}`);
};

/** Activa o inactiva (PATCH /usuarios/:id/estado); devuelve el registro actualizado. */
export const cambiarEstadoUsuario = async (id, estado) => {
  return api.patch(`/usuarios/${id}/estado`, { estado });
};
