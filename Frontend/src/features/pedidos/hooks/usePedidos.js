import { useState, useEffect, useMemo } from 'react';
import { getPedidos, createPedido, updatePedido, deletePedido } from '../services/pedidosService';
import { toast } from '../../../shared/utils/toast';

// Pedidos y Ventas son la misma entidad: un pedido Entregado es una venta y se
// muestra en el módulo de Ventas, no aquí.
export const esEntregado = (pedido) => String(pedido?.estado || '').toLowerCase() === 'entregado';

// Venta: entregado, o anulado después de entregarse (fecha_entregado). Ambos viven en Ventas.
export const esVenta = (pedido) =>
  esEntregado(pedido) || (String(pedido?.estado || '').toLowerCase() === 'anulado' && Boolean(pedido?.fecha_entregado));

export function usePedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [detailModal, setDetailModal] = useState({ isOpen: false, data: null });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, nombre: '' });
  const [statusDialog, setStatusDialog] = useState({ isOpen: false, pedido: null, nextEstado: 'Activo' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchPedidos = () => {
    setIsLoading(true);
    setLoadError(null);
    return getPedidos()
      .then((data) => setPedidos(Array.isArray(data) ? data : []))
      .catch((error) => {
        setPedidos([]);
        setLoadError(error?.message || 'No se pudieron cargar los pedidos');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchPedidos();
  }, []);

  const filteredPedidos = useMemo(() => {
    return pedidos.filter((p) => {
      if (esVenta(p)) return false;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        String(p.id_pedido).toLowerCase().includes(q) ||
        String(p.id_cliente).toLowerCase().includes(q) ||
        (p.observaciones || '').toLowerCase().includes(q);
      const isTodosEstado = estadoFilter === 'Todos' || estadoFilter === 'Todos los estados';
      const matchesEstado = isTodosEstado || String(p.estado).toLowerCase() === String(estadoFilter).toLowerCase();
      return matchesSearch && matchesEstado;
    });
  }, [pedidos, searchQuery, estadoFilter]);

  const handleSave = async (formData) => {
    if (formData.id_pedido && esVenta(pedidos.find((p) => p.id_pedido === formData.id_pedido))) {
      toast.error(`El pedido #${formData.id_pedido} ya fue entregado: se consulta en Ventas`);
      setShowModal(false);
      return;
    }
    setIsSaving(true);
    try {
      if (formData.id_pedido) {
        const updated = await updatePedido(formData.id_pedido, formData);
        // Al quedar Entregado sale de la tabla de Pedidos (ver filtro) y aparece en Ventas.
        setPedidos((prev) =>
          prev.map((p) => (p.id_pedido === formData.id_pedido ? { ...p, ...updated } : p))
        );
        if (esEntregado(updated) || (!updated?.estado && esEntregado(formData))) {
          toast.success(`El pedido #${formData.id_pedido} fue entregado y ahora aparece en Ventas`);
        } else {
          toast.success('Cambios guardados');
        }
      } else {
        const created = await createPedido(formData);
        setPedidos((prev) => [created, ...prev]);
        toast.success('Pedido creado');
      }
      setShowModal(false);
    } catch (error) {
      toast.error(error?.data?.message || 'No se pudo guardar el pedido');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    setIsDeleting(true);
    try {
      await deletePedido(deleteDialog.id);
      setPedidos((prev) => prev.filter((p) => p.id_pedido !== deleteDialog.id));
      toast.success('Pedido eliminado');
    } catch (error) {
      toast.error('No se pudo eliminar el pedido');
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ isOpen: false, id: null, nombre: '' });
    }
  };

  const handleRequestStatusChange = (pedido) => {
    if (!pedido) return;
    const isCurrentlyActive = !['anulado', 'inactivo', 'cancelado'].includes(String(pedido.estado || '').toLowerCase());
    const nextEstado = isCurrentlyActive ? 'Inactivo' : 'Activo';
    setStatusDialog({
      isOpen: true,
      pedido,
      nextEstado,
    });
  };

  const handleConfirmStatusChange = async () => {
    if (!statusDialog.pedido) return;
    setIsUpdatingStatus(true);
    try {
      const { id_pedido } = statusDialog.pedido;
      await updatePedido(id_pedido, {
        ...statusDialog.pedido,
        estado: statusDialog.nextEstado,
      });

      setPedidos((prev) =>
        prev.map((p) =>
          p.id_pedido === id_pedido ? { ...p, estado: statusDialog.nextEstado } : p
        )
      );

      toast.success(`Estado del pedido #${id_pedido} cambiado a ${statusDialog.nextEstado}`);
      setStatusDialog({ isOpen: false, pedido: null, nextEstado: 'Activo' });
    } catch (error) {
      toast.error('No se pudo actualizar el estado del pedido');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return {
    pedidos: filteredPedidos,
    rawPedidos: pedidos,
    searchQuery,
    setSearchQuery,
    estadoFilter,
    setEstadoFilter,
    showModal,
    setShowModal,
    detailModal,
    setDetailModal,
    deleteDialog,
    setDeleteDialog,
    statusDialog,
    setStatusDialog,
    isDeleting,
    isSaving,
    isUpdatingStatus,
    isLoading,
    loadError,
    refetch: fetchPedidos,
    handleSave,
    handleDelete,
    handleRequestStatusChange,
    handleConfirmStatusChange,
  };
}


