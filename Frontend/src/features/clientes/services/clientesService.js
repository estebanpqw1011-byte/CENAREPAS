// clientesService.js - Servicio para la gestión de clientes en Masarepas
import { api } from '../../../shared/services/api.js';

export let mockClientes = [];

export const getClientes = async () => {
  return api.get('/clientes');
};

export const createCliente = async (cliente) => {
  return api.post('/clientes', cliente);
};

export const updateCliente = async (id_cliente, cliente) => {
  return api.put(`/clientes/${id_cliente}`, cliente);
};

export const deleteCliente = async (id_cliente) => {
  return api.delete(`/clientes/${id_cliente}`);
};

/** Activa o inactiva (PATCH /clientes/:id/estado); devuelve el registro actualizado. */
export const cambiarEstadoCliente = async (id, estado) => {
  return api.patch(`/clientes/${id}/estado`, { estado });
};
