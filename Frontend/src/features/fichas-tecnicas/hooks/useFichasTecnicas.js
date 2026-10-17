import { useState, useEffect, useMemo } from 'react';
import { getFichasTecnicas, createFichaTecnica, updateFichaTecnica, deleteFichaTecnica, cambiarEstadoFichaTecnica } from '../services/fichasTecnicasService';
import { toast } from '../../../shared/utils/toast';

export function useFichasTecnicas() {
  const [fichas, setFichas] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [detailModal, setDetailModal] = useState({ isOpen: false, data: null });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, nombre: '' });
  const [statusDialog, setStatusDialog] = useState({ isOpen: false, ficha: null, nextEstado: 'Activo' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchFichasTecnicas = () => {
    setIsLoading(true);
    setLoadError(null);
    return getFichasTecnicas()
      .then((data) => setFichas(Array.isArray(data) ? data : []))
      .catch((error) => {
        setFichas([]);
        setLoadError(error?.message || 'No se pudieron cargar las fichas técnicas');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchFichasTecnicas();
  }, []);

  const filteredFichas = useMemo(() => {
    return fichas.filter((f) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        f.nombre.toLowerCase().includes(q) ||
        (f.descripcion || '').toLowerCase().includes(q);
      const isTodos = estadoFilter === 'Todos' || estadoFilter === 'Todos los estados';
      const matchesEstado = isTodos || String(f.estado).toLowerCase() === String(estadoFilter).toLowerCase();
      return matchesSearch && matchesEstado;
    });
  }, [fichas, searchQuery, estadoFilter]);

  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      if (formData.id_ficha) {
        const updated = await updateFichaTecnica(formData.id_ficha, formData);
        setFichas((prev) =>
          prev.map((f) => (f.id_ficha === formData.id_ficha ? { ...f, ...updated } : f))
        );
        toast.success('Cambios guardados');
      } else {
        const created = await createFichaTecnica(formData);
        setFichas((prev) => [created, ...prev]);
        toast.success('Ficha técnica creada');
      }
      setShowModal(false);
    } catch (error) {
      toast.error(error?.data?.message || 'No se pudo guardar la ficha técnica');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    setIsDeleting(true);
    try {
      await deleteFichaTecnica(deleteDialog.id);
      setFichas((prev) => prev.filter((f) => f.id_ficha !== deleteDialog.id));
      toast.success('Ficha técnica eliminada');
    } catch (error) {
      toast.error('No se pudo eliminar la ficha técnica');
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ isOpen: false, id: null, nombre: '' });
    }
  };

  const handleRequestStatusChange = (ficha) => {
    if (!ficha) return;
    const isCurrentlyActive = String(ficha.estado || '').toLowerCase() === 'activo' || String(ficha.estado || '').toLowerCase() === 'vigente';
    const nextEstado = isCurrentlyActive ? 'Inactivo' : 'Activo';
    setStatusDialog({
      isOpen: true,
      ficha,
      nextEstado,
    });
  };

  const handleConfirmStatusChange = async () => {
    if (!statusDialog.ficha) return;
    setIsUpdatingStatus(true);
    try {
      const { id_ficha, nombre } = statusDialog.ficha;
      const actualizado = await cambiarEstadoFichaTecnica(id_ficha, statusDialog.nextEstado);

      setFichas((prev) =>
        prev.map((f) =>
          f.id_ficha === id_ficha ? { ...f, estado: actualizado?.estado || statusDialog.nextEstado } : f
        )
      );

      toast.success(`Estado de la receta "${nombre}" cambiado a ${statusDialog.nextEstado}`);
      setStatusDialog({ isOpen: false, ficha: null, nextEstado: 'Activo' });
    } catch (error) {
      toast.error(error?.data?.message || 'No se pudo actualizar el estado de la ficha técnica');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return {
    fichas: filteredFichas,
    rawFichas: fichas,
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
    refetch: fetchFichasTecnicas,
    handleSave,
    handleDelete,
    handleRequestStatusChange,
    handleConfirmStatusChange,
  };
}
