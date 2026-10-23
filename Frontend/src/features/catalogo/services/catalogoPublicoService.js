import { api } from '../../../shared/services/api.js';

// Catálogo público (sin sesión): el backend solo devuelve categorías activas
// y productos activos de categorías activas (optionalAuth en las rutas).
export const getCategoriasPublicas = () => api.get('/categorias');

export const getProductosPublicos = () => api.get('/productos');
