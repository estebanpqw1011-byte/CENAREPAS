import { useMemo } from 'react';
import { X, Check, Shield, Calendar, Hash, Info, Layers } from 'lucide-react';
import { mockPermisos, usePermissions } from '../../../shared/contexts/PermissionContext';

// Permisos por defecto para roles predefinidos si aún no se han personalizado
const DEFAULT_ROLE_PERMISSIONS = {
  1: mockPermisos.map((p) => p.id_permiso), // Admin: Todos los permisos
  2: [1, 10, 11, 12, 13, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41], // Supervisor Producción
  3: [1, 10, 11, 12, 13, 18, 19, 20, 21, 30, 31, 32, 33], // Gestor Compras
  4: [1, 14, 15, 16, 17, 38, 42, 43, 44, 45, 46, 47, 48, 49], // Ventas y Distribución
  5: [1, 26, 30, 34, 38], // Auditor Calidad
};

export default function RoleDetailModal({ isOpen, onClose, role }) {
  const { rolePermissions } = usePermissions();

  const permissionsByModule = useMemo(() => {
    return mockPermisos.reduce((acc, perm) => {
      if (!acc[perm.modulo]) acc[perm.modulo] = [];
      acc[perm.modulo].push(perm);
      return acc;
    }, {});
  }, []);

  const activePermissionIds = useMemo(() => {
    if (!role) return [];

    // 1. Si el rol tiene permisos explícitos en su objeto
    if (Array.isArray(role.permisos)) {
      return role.permisos
        .map((p) => (typeof p === 'object' && p?.id_permiso != null ? Number(p.id_permiso) : Number(p)))
        .filter((id) => !isNaN(id) && id > 0);
    }

    // 2. Si existen permisos guardados en el contexto para este id_rol
    if (rolePermissions && rolePermissions[role.id_rol]) {
      return (rolePermissions[role.id_rol] || []).map(Number);
    }

    // 3. Fallback a permisos predeterminados por id_rol
    if (DEFAULT_ROLE_PERMISSIONS[role.id_rol]) {
      return DEFAULT_ROLE_PERMISSIONS[role.id_rol];
    }

    // 4. Fallback especial para rol Administrador
    if (role.id_rol === 1 || ['administrador', 'admin'].includes(String(role.nombre || '').toLowerCase().trim())) {
      return mockPermisos.map((p) => Number(p.id_permiso));
    }

    return [];
  }, [role, rolePermissions]);

  if (!isOpen || !role) return null;

  const isActive = String(role.estado || '').toLowerCase() === 'activo';
  const totalSystemPermissions = mockPermisos.length;
  const activeCount = activePermissionIds.length;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-card text-card-foreground p-6 rounded-xl max-w-3xl w-full border border-border shadow-2xl space-y-6 max-h-[90vh] flex flex-col animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">{role.nombre}</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Información general y permisos asignados en el sistema
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto space-y-5 pr-1 flex-1 custom-scrollbar">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex flex-col justify-between h-full w-full">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <Hash className="w-3.5 h-3.5" />
                <span>Identificador</span>
              </div>
              <p className="text-sm font-semibold font-mono text-foreground mt-auto">
                #{role.id_rol}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex flex-col justify-between h-full w-full">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Fecha de Creación</span>
              </div>
              <p className="text-sm font-semibold text-foreground mt-auto">
                {formatDate(role.fecha_creacion)}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex flex-col justify-between h-full w-full">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                <Layers className="w-3.5 h-3.5" />
                <span>Permisos Asignados</span>
              </div>
              <p className="text-sm font-semibold text-foreground mt-auto">
                <span className="text-primary font-bold">{activeCount}</span>
                <span className="text-muted-foreground font-normal text-xs"> / {totalSystemPermissions} activos</span>
              </p>
            </div>
          </div>

          {/* Description */}
          {role.descripcion && (
            <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground font-medium mb-1">
                <Info className="w-3.5 h-3.5" />
                <span>Descripción del Rol</span>
              </div>
              <p className="text-foreground leading-relaxed">
                {role.descripcion}
              </p>
            </div>
          )}

          {/* Permissions Grouped by Module Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Permisos por Módulo
                </h3>
                <p className="text-xs text-muted-foreground">
                  Acciones configuradas y nivel de acceso asignado para este rol
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-primary/10 text-primary rounded-full">
                {activeCount} de {totalSystemPermissions} acciones
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1 custom-scrollbar">
              {Object.entries(permissionsByModule).map(([moduleName, modulePermissions]) => {
                const activeInModule = modulePermissions.filter((p) =>
                  activePermissionIds.includes(Number(p.id_permiso))
                );
                const hasAnyActive = activeInModule.length > 0;

                return (
                  <div
                    key={moduleName}
                    className={`border rounded-lg p-3 transition-colors ${
                      hasAnyActive
                        ? 'border-border bg-card'
                        : 'border-border/50 bg-muted/10 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-border/40">
                      <h4 className="font-semibold text-xs capitalize text-foreground flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            hasAnyActive ? 'bg-primary' : 'bg-muted-foreground/40'
                          }`}
                        />
                        {moduleName}
                      </h4>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          hasAnyActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {activeInModule.length} de {modulePermissions.length}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {modulePermissions.map((permiso) => {
                        const isPermActive = activePermissionIds.includes(Number(permiso.id_permiso));
                        return isPermActive ? (
                          <span
                            key={permiso.id_permiso}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs"
                          >
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span className="capitalize">{permiso.accion}</span>
                          </span>
                        ) : (
                          <span
                            key={permiso.id_permiso}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-normal text-muted-foreground/40 bg-muted/20 border border-border/30 opacity-60"
                          >
                            <X className="w-3 h-3" />
                            <span className="capitalize">{permiso.accion}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Estado (siempre de último) */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Estado</span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-muted text-muted-foreground border border-border'
              }`}
            >
              {isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-primary text-primary-foreground hover:opacity-90 rounded-lg text-sm font-medium transition-opacity shadow-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
