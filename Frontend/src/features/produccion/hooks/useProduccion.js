import { useState, useEffect, useMemo } from 'react';
import { getLotes, createLote, updateLote, anularLote } from '../services/produccionService';
import { toast } from '../../../shared/utils/toast';

export function useProduccion() {
  const [lotes, setLotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [detailModal, setDetailModal] = useState({ isOpen: false, data: null });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, nombre: '' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);

  useEffect(() => {
    getLotes()
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('La respuesta de lotes de producción no es válida');
        setLotes(data);
      })
      .catch(() => {
        setHasLoadError(true);
        toast.error('No se pudieron cargar los lotes de producción');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filteredLotes = useMemo(() => {
    return lotes.filter((l) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        String(l.id_lote).toLowerCase().includes(q) ||
        String(l.id_ficha).toLowerCase().includes(q) ||
        String(l.id_usuario_responsable).toLowerCase().includes(q);
      const isTodosEstado = estadoFilter === 'Todos' || estadoFilter === 'Todos los estados';
      const matchesEstado = isTodosEstado || String(l.estado).toLowerCase() === String(estadoFilter).toLowerCase();
      return matchesSearch && matchesEstado;
    });
  }, [lotes, searchQuery, estadoFilter]);

  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      if (formData.id_lote) {
        const updated = await updateLote(formData.id_lote, formData);
        setLotes((prev) =>
          prev.map((l) => (l.id_lote === formData.id_lote ? { ...l, ...updated } : l))
        );
        toast.success('Cambios guardados');
      } else {
        const created = await createLote(formData);
        setLotes((prev) => [created, ...prev]);
        toast.success('Lote de producción creado');
      }
      setShowModal(false);
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar el lote de producción');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnular = async () => {
    if (!deleteDialog.id) return;
    setIsDeleting(true);
    try {
      const cancelled = await anularLote(deleteDialog.id);
      setLotes((prev) =>
        prev.map((l) => (l.id_lote === deleteDialog.id ? { ...l, ...cancelled } : l))
      );
      toast.success('Lote anulado correctamente');
    } catch (error) {
      toast.error(error.message || 'No se pudo anular el lote de producción');
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ isOpen: false, id: null, nombre: '' });
    }
  };

  return {
    lotes: filteredLotes,
    rawLotes: lotes,
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
    hasLoadError,
    handleSave,
    handleAnular,
  };
}
