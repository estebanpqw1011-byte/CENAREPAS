import { useState, useEffect, useMemo } from 'react';
import { getProductos, createProducto, updateProducto, deleteProducto, cambiarEstadoProducto } from '../services/productosService';
import { toast } from '../../../shared/utils/toast';

export function useProductos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('Todas las categorías');
  const [filterEstado, setFilterEstado] = useState('Todos los estados');
  const [showModal, setShowModal] = useState(false);
  const [detailModal, setDetailModal] = useState({ isOpen: false, data: null });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, nombre: '' });
  const [statusDialog, setStatusDialog] = useState({ isOpen: false, producto: null, nextEstado: 'Activo' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [productos, setProductos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchProductos = () => {
    setIsLoading(true);
    setLoadError(null);
    return getProductos()
      .then((data) => setProductos(Array.isArray(data) ? data : []))
      .catch((error) => {
        setProductos([]);
        setLoadError(error?.message || 'No se pudieron cargar los productos');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const filteredProductos = useMemo(() => {
    return productos.filter((producto) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        producto.nombre.toLowerCase().includes(q) ||
        (producto.descripcion || '').toLowerCase().includes(q);
      const matchesCategoria =
        filterCategoria === 'Todas las categorías' ||
        filterCategoria === 'Todas' ||
        String(producto.id_categoria) === filterCategoria;
      const matchesEstado =
        filterEstado === 'Todos los estados' ||
        filterEstado === 'Todos' ||
        String(producto.estado).toLowerCase() === String(filterEstado).toLowerCase();

      return matchesSearch && matchesCategoria && matchesEstado;
    });
  }, [productos, searchTerm, filterCategoria, filterEstado]);

  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      if (formData.id_producto) {
        const updated = await updateProducto(formData.id_producto, formData);
        setProductos((prev) =>
          prev.map((p) => (p.id_producto === formData.id_producto ? { ...p, ...updated } : p))
        );
        toast.success('Cambios guardados');
      } else {
        const created = await createProducto(formData);
        setProductos((prev) => [created, ...prev]);
        toast.success('Producto creado');
      }
      setShowModal(false);
    } catch (error) {
      toast.error(error?.data?.message || 'No se pudo guardar el producto');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    setIsDeleting(true);
    try {
      await deleteProducto(deleteDialog.id);
      setProductos((prev) => prev.filter((p) => p.id_producto !== deleteDialog.id));
      toast.success('Producto eliminado');
    } catch (error) {
      toast.error('No se pudo eliminar el producto');
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ isOpen: false, id: null, nombre: '' });
    }
  };

  const handleRequestStatusChange = (producto) => {
    if (!producto) return;
    const isCurrentlyActive = String(producto.estado || '').toLowerCase() === 'activo' || String(producto.estado || '').toLowerCase() === 'disponible';
    const nextEstado = isCurrentlyActive ? 'Inactivo' : 'Activo';
    setStatusDialog({
      isOpen: true,
      producto,
      nextEstado,
    });
  };

  const handleConfirmStatusChange = async () => {
    if (!statusDialog.producto) return;
    setIsUpdatingStatus(true);
    try {
      const { id_producto, nombre } = statusDialog.producto;
      const actualizado = await cambiarEstadoProducto(id_producto, statusDialog.nextEstado);

      setProductos((prev) =>
        prev.map((p) =>
          p.id_producto === id_producto ? { ...p, estado: actualizado?.estado || statusDialog.nextEstado } : p
        )
      );

      toast.success(`Estado del producto "${nombre}" cambiado a ${statusDialog.nextEstado}`);
      setStatusDialog({ isOpen: false, producto: null, nextEstado: 'Activo' });
    } catch (error) {
      toast.error(error?.data?.message || 'No se pudo actualizar el estado del producto');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    filterCategoria,
    setFilterCategoria,
    filterEstado,
    setFilterEstado,
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
    refetch: fetchProductos,
    productos,
    filteredProductos,
    handleSave,
    handleDelete,
    handleRequestStatusChange,
    handleConfirmStatusChange,
  };
}


