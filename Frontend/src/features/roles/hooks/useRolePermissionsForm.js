import { useState, useMemo, useCallback } from 'react';
import { mockPermisos } from '../../../shared/contexts/PermissionContext';

/**
 * Hook para gestionar el estado controlado y la sincronización de selección
 * de permisos por módulo y selección global ("Seleccionar todo").
 */
export function useRolePermissionsForm(initialPermissions = [], availablePermissions = mockPermisos) {
  const [selectedPermissions, setSelectedPermissions] = useState(() => {
    return Array.isArray(initialPermissions)
      ? initialPermissions
          .map((p) => (typeof p === 'object' && p?.id_permiso != null ? Number(p.id_permiso) : Number(p)))
          .filter((id) => !isNaN(id) && id > 0)
      : [];
  });

  const resetPermissions = useCallback((perms = []) => {
    const clean = Array.isArray(perms)
      ? perms
          .map((p) => (typeof p === 'object' && p?.id_permiso != null ? Number(p.id_permiso) : Number(p)))
          .filter((id) => !isNaN(id) && id > 0)
      : [];
    setSelectedPermissions(clean);
  }, []);

  const allPermissionIds = useMemo(() => {
    return (availablePermissions || []).map((p) => Number(p.id_permiso));
  }, [availablePermissions]);

  const permissionsByModule = useMemo(() => {
    return (availablePermissions || []).reduce((acc, perm) => {
      if (!acc[perm.modulo]) acc[perm.modulo] = [];
      acc[perm.modulo].push(perm);
      return acc;
    }, {});
  }, [availablePermissions]);

  // Checkbox global: ¿Están todos los permisos del sistema seleccionados?
  const isGlobalAllSelected = useMemo(() => {
    if (allPermissionIds.length === 0) return false;
    return allPermissionIds.every((id) => selectedPermissions.includes(id));
  }, [allPermissionIds, selectedPermissions]);

  // Checkbox por módulo: ¿Están todos los permisos de este módulo seleccionados?
  const isModuleAllSelected = useCallback((moduleName) => {
    const modulePerms = permissionsByModule[moduleName] || [];
    if (modulePerms.length === 0) return false;
    return modulePerms.every((p) => selectedPermissions.includes(Number(p.id_permiso)));
  }, [permissionsByModule, selectedPermissions]);

  // Alternar selección global (todos los módulos)
  const toggleGlobalAll = useCallback((forceValue) => {
    setSelectedPermissions((prev) => {
      const allSelectedNow = allPermissionIds.length > 0 && allPermissionIds.every((id) => prev.includes(id));
      const shouldSelect = typeof forceValue === 'boolean' ? forceValue : !allSelectedNow;
      return shouldSelect ? [...allPermissionIds] : [];
    });
  }, [allPermissionIds]);

  // Alternar selección de un módulo individual
  const toggleModuleAll = useCallback((moduleName, forceValue) => {
    const modulePerms = permissionsByModule[moduleName] || [];
    const moduleIds = modulePerms.map((p) => Number(p.id_permiso));
    if (moduleIds.length === 0) return;

    setSelectedPermissions((prev) => {
      const allModuleSelectedNow = moduleIds.every((id) => prev.includes(id));
      const shouldSelect = typeof forceValue === 'boolean' ? forceValue : !allModuleSelectedNow;
      const filtered = prev.filter((id) => !moduleIds.includes(id));
      return shouldSelect ? [...filtered, ...moduleIds] : filtered;
    });
  }, [permissionsByModule]);

  // Alternar un permiso individual
  const togglePermission = useCallback((permissionId) => {
    const permId = Number(permissionId);
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  }, []);

  const isPermissionSelected = useCallback((permissionId) => {
    return selectedPermissions.includes(Number(permissionId));
  }, [selectedPermissions]);

  return {
    selectedPermissions,
    setSelectedPermissions,
    resetPermissions,
    permissionsByModule,
    isGlobalAllSelected,
    isModuleAllSelected,
    toggleGlobalAll,
    toggleModuleAll,
    togglePermission,
    isPermissionSelected,
    totalSelectedCount: selectedPermissions.length,
    totalAvailableCount: allPermissionIds.length,
  };
}
