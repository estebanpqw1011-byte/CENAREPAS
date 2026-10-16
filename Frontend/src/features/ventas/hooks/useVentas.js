import { useState, useEffect, useMemo } from 'react';
import { getVentas, createVenta, updateVenta } from '../services/ventasService';
import { toast } from '../../../shared/utils/toast';

export function useVentas() {
  const [ventas, setVentas] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [detailModal, setDetailModal] = useState({ isOpen: false, data: null });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, nombre: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      if (formData.id_venta) {
        const updated = await updateVenta(formData.id_venta, formData);
        setVentas((prev) =>
          prev.map((v) => (v.id_venta === formData.id_venta ? { ...v, ...updated } : v))
        );
        toast.success('Cambios guardados');
      } else {
        const created = await createVenta(formData);
        setVentas((prev) => [created, ...prev]);
        toast.success('Venta registrada');
      }
      setShowModal(false);
    } catch (error) {
      toast.error(error?.data?.message || 'No se pudo guardar la venta');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnular = async () => {
    if (!deleteDialog.id) return;
    setIsDeleting(true);
    try {
      await updateVenta(deleteDialog.id, { estado: 'anulada' });
      setVentas((prev) =>
        prev.map((v) => (v.id_venta === deleteDialog.id ? { ...v, estado: 'anulada' } : v))
      );
      toast.success('Venta anulada correctamente');
    } catch {
      toast.error('No se pudo anular la venta');
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ isOpen: false, id: null, nombre: '' });
    }
  };

  return {
    ventas: filteredVentas,
    rawVentas: ventas,
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
    isDeleting,
    isSaving,
    isLoading,
    loadError,
    refetch: fetchVentas,
    handleSave,
    handleAnular,
  };
}
