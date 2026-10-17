import { useState, useEffect, useMemo } from 'react';
import { getVentas } from '../services/ventasService';

export function useVentas() {
  const [ventas, setVentas] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Todos');
  const [detailModal, setDetailModal] = useState({ isOpen: false, data: null });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchVentas = () => {
    setIsLoading(true);
    setLoadError(null);
    return getVentas()
      .then((data) => setVentas(Array.isArray(data) ? data : []))
      .catch((error) => {
        setVentas([]);
        setLoadError(error?.message || 'No se pudieron cargar las ventas');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchVentas();
  }, []);

  const filteredVentas = useMemo(() => {
    return ventas.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        String(v.id_venta).toLowerCase().includes(q) ||
        String(v.id_cliente).toLowerCase().includes(q) ||
        String(v.id_sede).toLowerCase().includes(q) ||
        (v.medio_pago || '').toLowerCase().includes(q);
      const isTodosEstado = estadoFilter === 'Todos' || estadoFilter === 'Todos los estados';
      const matchesEstado = isTodosEstado || String(v.estado).toLowerCase() === String(estadoFilter).toLowerCase();
      return matchesSearch && matchesEstado;
    });
  }, [ventas, searchQuery, estadoFilter]);

  // Solo lectura: el backend responde 405 a crear, editar o anular ventas (una venta
  // es un pedido Entregado; se anula desde Pedidos).
  return {
    ventas: filteredVentas,
    rawVentas: ventas,
    searchQuery,
    setSearchQuery,
    estadoFilter,
    setEstadoFilter,
    detailModal,
    setDetailModal,
    isLoading,
    loadError,
    refetch: fetchVentas,
  };
}
