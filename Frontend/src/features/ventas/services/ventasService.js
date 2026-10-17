// ventasService.js - Servicio para la gestión de ventas en Masarepas
import { api } from '../../../shared/services/api.js';

export const getVentas = async () => {
  return api.get('/ventas');
};

// Ventas de solo lectura: son los pedidos Entregado (POST, PUT y DELETE /ventas → 405).