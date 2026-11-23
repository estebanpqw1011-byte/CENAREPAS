// sedesService.js - Servicio para la gestión de sedes en Masarepas / CENAREPAS
import { api } from '../../../shared/services/api.js';

export let mockSedes = [];

export const getSedes = async () => {
  return api.get('/sedes');
};

export const getSedeById = async (id_sede) => {
  return api.get(`/sedes/${id_sede}`);
};

export const createSede = async (sede) => {
  return api.post('/sedes', sede);
};

export const updateSede = async (id_sede, sede) => {
  return api.put(`/sedes/${id_sede}`, sede);
};

export const deleteSede = async (id_sede) => {
  return api.delete(`/sedes/${id_sede}`);
};
