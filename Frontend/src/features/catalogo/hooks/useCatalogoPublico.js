import { useCallback, useEffect, useState } from 'react';
import { getCategoriasPublicas, getProductosPublicos } from '../services/catalogoPublicoService';

/**
 * Carga del catálogo público. Las opciones eligen qué consultar
 * ({ categorias, productos }, ambas true por defecto); `recargar` repite la consulta.
 */
export function useCatalogoPublico({ categorias: conCategorias = true, productos: conProductos = true } = {}) {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const recargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [listaCategorias, listaProductos] = await Promise.all([
        conCategorias ? getCategoriasPublicas() : [],
        conProductos ? getProductosPublicos() : [],
      ]);
      setCategorias(Array.isArray(listaCategorias) ? listaCategorias : []);
      setProductos(Array.isArray(listaProductos) ? listaProductos : []);
    } catch (err) {
      setError(err?.message || 'No se pudo cargar el catálogo.');
    } finally {
      setCargando(false);
    }
  }, [conCategorias, conProductos]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { categorias, productos, cargando, error, recargar };
}
