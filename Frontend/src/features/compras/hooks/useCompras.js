import { useState, useEffect } from 'react';
import { getCompras, createCompra, updateCompra, anularCompra } from '../services/comprasService';
import { toast } from '../../../shared/utils/toast';

export function useCompras() {
  const [compras, setCompras] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [detailModal, setDetailModal] = useState({ isOpen: false, data: null });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, nombre: '' });
  const [statusDialog, setStatusDialog] = useState({ isOpen: false, compra: null, nextEstado: 'Registrada' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchCompras = () => {
    setIsLoading(true);
    setLoadError(null);
    return getCompras()
      .then((data) => setCompras(Array.isArray(data) ? data : []))
      .catch((error) => {
        setCompras([]);
        setLoadError(error?.message || 'No se pudieron cargar las compras');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchCompras();
  }, []);

  const filteredCompras = compras.filter((c) => {
    const matchesSearch =
      String(c.id_compra).includes(searchQuery.toLowerCase()) ||
      String(c.id_proveedor).includes(searchQuery.toLowerCase()) ||
      String(c.id_usuario).includes(searchQuery.toLowerCase());
    const matchesEstado = estadoFilter === 'Todos' || String(c.estado).toLowerCase() === String(estadoFilter).toLowerCase();
    return matchesSearch && matchesEstado;
  });

  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      if (formData.id_compra) {
        const updated = await updateCompra(formData.id_compra, formData);
        setCompras((prev) =>
          prev.map((c) => (c.id_compra === formData.id_compra ? { ...c, ...updated } : c))
        );
        toast.success('Cambios guardados');
      } else {
        const created = await createCompra(formData);
        setCompras((prev) => [created, ...prev]);
        toast.success('Orden de compra creada');
      }
      setShowModal(false);
    } catch (error) {
      toast.error(error?.data?.message || 'No se pudo guardar la compra');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnular = async () => {
    if (!deleteDialog.id) return;
    setIsDeleting(true);
    try {
      await anularCompra(deleteDialog.id);
      setCompras((prev) =>
        prev.map((c) => (c.id_compra === deleteDialog.id ? { ...c, estado: 'Anulada' } : c))
      );
      toast.success('Orden de compra anulada');
    } catch (error) {
      toast.error('No se pudo anular la compra');
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ isOpen: false, id: null, nombre: '' });
    }
  };

  const handleRequestStatusChange = (compra) => {
    if (!compra) return;
    const isCurrentlyActive = !['anulada', 'anulado', 'inactivo'].includes(String(compra.estado || '').toLowerCase());
    const nextEstado = isCurrentlyActive ? 'Anulada' : 'Registrada';
    setStatusDialog({
      isOpen: true,
      compra,
      nextEstado,
    });
  };

  const handleConfirmStatusChange = async () => {
    if (!statusDialog.compra) return;
    setIsUpdatingStatus(true);
    try {
      const { id_compra } = statusDialog.compra;
      await updateCompra(id_compra, {
        ...statusDialog.compra,
        estado: statusDialog.nextEstado,
      });

      setCompras((prev) =>
        prev.map((c) =>
          c.id_compra === id_compra ? { ...c, estado: statusDialog.nextEstado } : c
        )
      );

      toast.success(`Estado de la compra #${id_compra} cambiado a ${statusDialog.nextEstado}`);
      setStatusDialog({ isOpen: false, compra: null, nextEstado: 'Registrada' });
    } catch (error) {
      toast.error('No se pudo actualizar el estado de la compra');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return {
    compras: filteredCompras,
    rawCompras: compras,
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
    refetch: fetchCompras,
    handleSave,
    handleAnular,
    handleRequestStatusChange,
    handleConfirmStatusChange,
  };
}
