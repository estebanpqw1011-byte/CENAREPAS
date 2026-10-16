import { useState, useEffect } from 'react';
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from '../services/categoriasService';
import { toast } from '../../../shared/utils/toast';

export function useCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [detailModal, setDetailModal] = useState({ isOpen: false, data: null });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, nombre: '' });
  const [statusDialog, setStatusDialog] = useState({ isOpen: false, categoria: null, nextEstado: 'Activo' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchCategorias = () => {
    setIsLoading(true);
    setLoadError(null);
    return getCategorias()
      .then((data) => setCategorias(Array.isArray(data) ? data : []))
      .catch((error) => {
        setCategorias([]);
        setLoadError(error?.message || 'No se pudieron cargar las categorías');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  const filteredCategorias = categorias.filter((c) => {
    const matchesSearch =
      c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.descripcion || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEstado = estadoFilter === 'Todos' || c.estado === estadoFilter;
    return matchesSearch && matchesEstado;
  });

  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      if (formData.id_categoria) {
        const updated = await updateCategoria(formData.id_categoria, formData);
        setCategorias((prev) =>
          prev.map((c) => (c.id_categoria === formData.id_categoria ? { ...c, ...updated } : c))
        );
        toast.success('Cambios guardados');
      } else {
        const created = await createCategoria(formData);
        setCategorias((prev) => [created, ...prev]);
        toast.success('Categoría creada');
      }
      setShowModal(false);
    } catch (error) {
      toast.error(error?.data?.message || 'No se pudo guardar la categoría');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    setIsDeleting(true);
    try {
      await deleteCategoria(deleteDialog.id);
      setCategorias((prev) => prev.filter((c) => c.id_categoria !== deleteDialog.id));
      toast.success('Categoría eliminada');
    } catch (error) {
      toast.error('No se pudo eliminar la categoría');
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ isOpen: false, id: null, nombre: '' });
    }
  };

  const handleRequestStatusChange = (categoria) => {
    if (!categoria) return;
    const isCurrentlyActive = String(categoria.estado || '').toLowerCase() === 'activo';
    const nextEstado = isCurrentlyActive ? 'Inactivo' : 'Activo';
    setStatusDialog({
      isOpen: true,
      categoria,
      nextEstado,
    });
  };

  const handleConfirmStatusChange = async () => {
    if (!statusDialog.categoria) return;
    setIsUpdatingStatus(true);
    try {
      const { id_categoria, nombre } = statusDialog.categoria;
      await updateCategoria(id_categoria, {
        ...statusDialog.categoria,
        estado: statusDialog.nextEstado,
      });

      setCategorias((prev) =>
        prev.map((c) =>
          c.id_categoria === id_categoria ? { ...c, estado: statusDialog.nextEstado } : c
        )
      );

      toast.success(`Estado de la categoría "${nombre}" cambiado a ${statusDialog.nextEstado}`);
      setStatusDialog({ isOpen: false, categoria: null, nextEstado: 'Activo' });
    } catch (error) {
      toast.error('No se pudo actualizar el estado de la categoría');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return {
    categorias: filteredCategorias,
    rawCategorias: categorias,
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
    refetch: fetchCategorias,
    handleSave,
    handleDelete,
    handleRequestStatusChange,
    handleConfirmStatusChange,
  };
}

