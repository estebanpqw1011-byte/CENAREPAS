import { useState, useEffect, useMemo } from 'react';
import { getInsumos, createInsumo, updateInsumo, deleteInsumo, cambiarEstadoInsumo } from '../services/insumosService';
import { toast } from '../../../shared/utils/toast';

export function useInsumos() {
  const [insumos, setInsumos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('Todas');
  const [estadoFilter, setEstadoFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [detailModal, setDetailModal] = useState({ isOpen: false, data: null });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, nombre: '' });
  const [statusDialog, setStatusDialog] = useState({ isOpen: false, insumo: null, nextEstado: 'Activo' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchInsumos = () => {
    setIsLoading(true);
    setLoadError(null);
    return getInsumos()
      .then((data) => setInsumos(Array.isArray(data) ? data : []))
      .catch((error) => {
        setInsumos([]);
        setLoadError(error?.message || 'No se pudieron cargar los insumos');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchInsumos();
  }, []);

  const filteredInsumos = useMemo(() => {
    return insumos.filter((i) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        i.nombre.toLowerCase().includes(q) ||
        String(i.id_proveedor).includes(q);
      const isTodosCat = categoriaFilter === 'Todas' || categoriaFilter === 'Todas las categorías';
      const matchesCat = isTodosCat || String(i.id_proveedor) === categoriaFilter;
      const isTodosEstado = estadoFilter === 'Todos' || estadoFilter === 'Todos los estados';
      const matchesEstado = isTodosEstado || String(i.estado).toLowerCase() === String(estadoFilter).toLowerCase();
      return matchesSearch && matchesCat && matchesEstado;
    });
  }, [insumos, searchQuery, categoriaFilter, estadoFilter]);

  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      if (formData.id_insumo) {
        const updated = await updateInsumo(formData.id_insumo, formData);
        setInsumos((prev) =>
          prev.map((i) => (i.id_insumo === formData.id_insumo ? { ...i, ...updated } : i))
        );
        toast.success('Cambios guardados');
      } else {
        const created = await createInsumo(formData);
        setInsumos((prev) => [created, ...prev]);
        toast.success('Insumo creado');
      }
      setShowModal(false);
    } catch (error) {
      toast.error(error?.data?.message || 'No se pudo guardar el insumo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    setIsDeleting(true);
    try {
      await deleteInsumo(deleteDialog.id);
      setInsumos((prev) => prev.filter((i) => i.id_insumo !== deleteDialog.id));
      toast.success('Insumo eliminado');
    } catch (error) {
      toast.error('No se pudo eliminar el insumo');
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ isOpen: false, id: null, nombre: '' });
    }
  };

  const handleRequestStatusChange = (insumo) => {
    if (!insumo) return;
    const isCurrentlyActive = String(insumo.estado || '').toLowerCase() === 'activo' || String(insumo.estado || '').toLowerCase() === 'disponible';
    const nextEstado = isCurrentlyActive ? 'Inactivo' : 'Activo';
    setStatusDialog({
      isOpen: true,
      insumo,
      nextEstado,
    });
  };

  const handleConfirmStatusChange = async () => {
    if (!statusDialog.insumo) return;
    setIsUpdatingStatus(true);
    try {
      const { id_insumo, nombre } = statusDialog.insumo;
      const actualizado = await cambiarEstadoInsumo(id_insumo, statusDialog.nextEstado);

      setInsumos((prev) =>
        prev.map((i) =>
          i.id_insumo === id_insumo ? { ...i, estado: actualizado?.estado || statusDialog.nextEstado } : i
        )
      );

      toast.success(`Estado del insumo "${nombre}" cambiado a ${statusDialog.nextEstado}`);
      setStatusDialog({ isOpen: false, insumo: null, nextEstado: 'Activo' });
    } catch (error) {
      toast.error(error?.data?.message || 'No se pudo actualizar el estado del insumo');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return {
    insumos: filteredInsumos,
    rawInsumos: insumos,
    searchQuery,
    setSearchQuery,
    categoriaFilter,
    setCategoriaFilter,
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
    refetch: fetchInsumos,
    handleSave,
    handleDelete,
    handleRequestStatusChange,
    handleConfirmStatusChange,
  };
}
