// categoriasService.js - Servicio para la gestión de categorías en Masarepas
import { api } from '../../../shared/services/api.js';

export let mockCategorias = [];

export const getCategorias = async () => {
  return api.get('/categorias');
};

export const createCategoria = async (categoria) => {
  return api.post('/categorias', categoria);
};

export const updateCategoria = async (id_categoria, categoria) => {
  return api.put(`/categorias/${id_categoria}`, categoria);
};

export const deleteCategoria = async (id_categoria) => {
  return api.delete(`/categorias/${id_categoria}`);
};

/** Activa o inactiva (PATCH /categorias/:id/estado); devuelve el registro actualizado. */
export const cambiarEstadoCategoria = async (id, estado) => {
  return api.patch(`/categorias/${id}/estado`, { estado });
};
