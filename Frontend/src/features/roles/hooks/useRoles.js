import { useState, useEffect, useMemo } from 'react';
import { getRoles, createRol, updateRol, deleteRol } from '../services/rolesService';
import { toast } from '../../../shared/utils/toast';

export const isAdminRole = (rol) => {
  if (!rol) return false;
  const id = Number(rol.id_rol ?? rol.id);
  const name = String(rol.nombre || '').toLowerCase().trim();
  return id === 1 || name === 'admin' || name === 'administrador';
};

export function useRoles() {
  const [roles, setRoles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [detailModal, setDetailModal] = useState({ isOpen: false, data: null });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, nombre: '' });
  const [statusDialog, setStatusDialog] = useState({ isOpen: false, rol: null, nextEstado: 'Activo' });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const fetchRoles = () => {
    setIsLoading(true);
    setLoadError(null);
    return getRoles()
      .then((data) => setRoles(Array.isArray(data) ? data : []))
      .catch((error) => {
        setRoles([]);
        setLoadError(error?.message || 'No se pudieron cargar los roles');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const filteredRoles = useMemo(() => {
    return roles.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.nombre.toLowerCase().includes(q) ||
        (r.descripcion || '').toLowerCase().includes(q);
      const isTodosEstado = estadoFilter === 'Todos' || estadoFilter === 'Todos los estados';
      const matchesEstado = isTodosEstado || String(r.estado).toLowerCase() === String(estadoFilter).toLowerCase();
      return matchesSearch && matchesEstado;
    });
  }, [roles, searchQuery, estadoFilter]);

  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      if (formData.id_rol) {
        // Asegurar que si es rol Administrador, no pueda guardarse como Inactivo
        const isTargetAdmin = isAdminRole(formData);
        const dataToSave = isTargetAdmin ? { ...formData, estado: 'Activo' } : formData;

        const updated = await updateRol(formData.id_rol, dataToSave);
        const merged = { ...formData, ...dataToSave, ...(updated || {}), permisos: dataToSave.permisos };
        setRoles((prev) =>
          prev.map((r) => (r.id_rol === formData.id_rol ? { ...r, ...merged } : r))
        );
        toast.success('Cambios guardados');
      } else {
        const created = await createRol(formData);
        const merged = { ...formData, ...(created || {}), permisos: formData.permisos };
        setRoles((prev) => [merged, ...prev]);
        toast.success('Rol creado');
      }
      setShowModal(false);
    } catch (error) {
      toast.error(error?.data?.message || 'No se pudo guardar el rol');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    const targetRole = roles.find((r) => r.id_rol === deleteDialog.id);
    if (isAdminRole(targetRole)) {
      toast.error('El rol Administrador es principal del sistema y no puede ser eliminado');
      setDeleteDialog({ isOpen: false, id: null, nombre: '' });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteRol(deleteDialog.id);
      setRoles((prev) => prev.filter((r) => r.id_rol !== deleteDialog.id));
      toast.success('Rol eliminado');
    } catch (error) {
      toast.error('No se pudo eliminar el rol');
    } finally {
      setIsDeleting(false);
      setDeleteDialog({ isOpen: false, id: null, nombre: '' });
    }
  };

  const handleRequestStatusChange = (rol) => {
    if (!rol) return;
    if (isAdminRole(rol)) {
      toast.warning('El rol Administrador es principal del sistema y no puede ser desactivado');
      return;
    }
    const isCurrentlyActive = String(rol.estado || '').toLowerCase() === 'activo';
    const nextEstado = isCurrentlyActive ? 'Inactivo' : 'Activo';
    setStatusDialog({
      isOpen: true,
      rol,
      nextEstado,
    });
  };

  const handleConfirmStatusChange = async () => {
    if (!statusDialog.rol) return;
    if (isAdminRole(statusDialog.rol) && statusDialog.nextEstado.toLowerCase() === 'inactivo') {
      toast.error('El rol Administrador no puede ser desactivado');
      setStatusDialog({ isOpen: false, rol: null, nextEstado: 'Activo' });
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const { id_rol, nombre } = statusDialog.rol;
      await updateRol(id_rol, {
        ...statusDialog.rol,
        estado: statusDialog.nextEstado,
      });

      setRoles((prev) =>
        prev.map((r) =>
          r.id_rol === id_rol ? { ...r, estado: statusDialog.nextEstado } : r
        )
      );

      toast.success(`Estado del rol "${nombre}" cambiado a ${statusDialog.nextEstado}`);
      setStatusDialog({ isOpen: false, rol: null, nextEstado: 'Activo' });
    } catch (error) {
      toast.error('No se pudo actualizar el estado del rol');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return {
    roles: filteredRoles,
    rawRoles: roles,
    searchQuery,
    setSearchQuery,
    estadoFilter,
    setEstadoFilter,
    showModal,
    setShowModal,
    selectedRole,
    setSelectedRole,
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
    refetch: fetchRoles,
    handleSave,
    handleDelete,
    handleRequestStatusChange,
    handleConfirmStatusChange,
    isAdminRole,
  };
}


