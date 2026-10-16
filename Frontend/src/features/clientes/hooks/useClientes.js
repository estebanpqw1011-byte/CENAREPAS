import { useState, useEffect, useMemo } from 'react';
import { getClientes, createCliente, updateCliente, deleteCliente } from '../services/clientesService';
import { toast } from '../../../shared/utils/toast';

export function useClientes() {
  const [clientes, setClientes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [detailModal, setDetailModal] = useState({ isOpen: false, data: null });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, nombre: '' });
  const [statusDialog, setStatusDialog] = useState({ isOpen: false, cliente: null, nextEstado: 'Activo' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchClientes = () => {
    setIsLoading(true);
    setLoadError(null);
    return getClientes()
      .then((data) => setClientes(Array.isArray(data) ? data : []))
      .catch((error) => {
        setClientes([]);
        setLoadError(error?.message || 'No se pudieron cargar los clientes');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  const filteredClientes = useMemo(() => {
    return clientes.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.nombre.toLowerCase().includes(q) ||
        (c.documento || '').toLowerCase().includes(q) ||
        (c.correo || '').toLowerCase().includes(q) ||
        (c.direccion || '').toLowerCase().includes(q) ||
        (c.telefono || '').toLowerCase().includes(q);

      const isTodos = estadoFilter === 'Todos' || estadoFilter === 'Todos los estados';
      const matchesEstado =
        isTodos || String(c.estado).toLowerCase() === String(estadoFilter).toLowerCase();

      return matchesSearch && matchesEstado;
    });
  }, [clientes, searchQuery, estadoFilter]);

  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      if (formData.id_cliente) {
        const updated = await updateCliente(formData.id_cliente, formData);
        setClientes((prev) =>
          prev.map((c) => (c.id_cliente === formData.id_cliente ? { ...c, ...updated } : c))
        );
        toast.success('Cambios guardados');
      } else {
        const created = await createCliente(formData);
        setClientes((prev) => [created, ...prev]);
        toast.success('Cliente registrado');
      }
      setShowModal(false);
    } catch (error) {
      toast.error(error?.data?.message || 'No se pudo guardar el cliente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    setIsDeleting(true);
    try {
      await deleteCliente(deleteDialog.id);
      setClientes((prev) => prev.filter((c) => c.id_cliente !== deleteDialog.id));
      toast.success('Cliente eliminado');
    } catch (error) {
      toast.error('No se pudo eliminar el cliente');
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ isOpen: false, id: null, nombre: '' });
    }
  };

  const handleRequestStatusChange = (cliente) => {
    if (!cliente) return;
    const isCurrentlyActive = String(cliente.estado || '').toLowerCase() === 'activo';
    const nextEstado = isCurrentlyActive ? 'Inactivo' : 'Activo';
    setStatusDialog({
      isOpen: true,
      cliente,
      nextEstado,
    });
  };

  const handleConfirmStatusChange = async () => {
    if (!statusDialog.cliente) return;
    setIsUpdatingStatus(true);
    try {
      const { id_cliente, nombre, direccion } = statusDialog.cliente;
      await updateCliente(id_cliente, {
        ...statusDialog.cliente,
        estado: statusDialog.nextEstado,
      });

      setClientes((prev) =>
        prev.map((c) =>
          c.id_cliente === id_cliente ? { ...c, estado: statusDialog.nextEstado } : c
        )
      );

      toast.success(`Estado del cliente "${nombre}" cambiado a ${statusDialog.nextEstado}`);
      setStatusDialog({ isOpen: false, cliente: null, nextEstado: 'Activo' });
    } catch (error) {
      toast.error('No se pudo actualizar el estado del cliente');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return {
    clientes: filteredClientes,
    rawClientes: clientes,
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
    refetch: fetchClientes,
    handleSave,
    handleDelete,
    handleRequestStatusChange,
    handleConfirmStatusChange,
  };
}
