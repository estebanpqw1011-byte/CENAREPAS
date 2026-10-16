import { api } from '../../../shared/services/api.js';

// Catálogo público: para el rol Cliente el backend devuelve solo productos
// activos de categorías activas, y solo categorías activas.
export const getProductosCatalogo = () => api.get('/productos');

export const getCategoriasCatalogo = () => api.get('/categorias');
