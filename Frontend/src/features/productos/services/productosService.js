// productosService.js - Servicio para la gestión de productos en Masarepas
import { api } from '../../../shared/services/api.js';

export let mockProductos = [];

export const getProductos = async () => {
  return api.get('/productos');
};

export const createProducto = async (producto) => {
  return api.post('/productos', producto);
};

export const updateProducto = async (id_producto, producto) => {
  return api.put(`/productos/${id_producto}`, producto);
};

export const deleteProducto = async (id_producto) => {
  return api.delete(`/productos/${id_producto}`);
};

/** Activa o inactiva (PATCH /productos/:id/estado); devuelve el registro actualizado. */
export const cambiarEstadoProducto = async (id, estado) => {
  return api.patch(`/productos/${id}/estado`, { estado });
};
