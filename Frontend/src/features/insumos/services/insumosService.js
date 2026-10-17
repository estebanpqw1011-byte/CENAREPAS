// insumosService.js - Servicio para la gestión de insumos en Masarepas
import { api } from '../../../shared/services/api.js';

export let mockInsumos = [];

export const getInsumos = async () => {
  return api.get('/insumos');
};

export const createInsumo = async (insumo) => {
  return api.post('/insumos', insumo);
};

export const updateInsumo = async (id_insumo, insumo) => {
  return api.put(`/insumos/${id_insumo}`, insumo);
};

export const deleteInsumo = async (id_insumo) => {
  return api.delete(`/insumos/${id_insumo}`);
};

/** Activa o inactiva (PATCH /insumos/:id/estado); devuelve el registro actualizado. */
export const cambiarEstadoInsumo = async (id, estado) => {
  return api.patch(`/insumos/${id}/estado`, { estado });
};
