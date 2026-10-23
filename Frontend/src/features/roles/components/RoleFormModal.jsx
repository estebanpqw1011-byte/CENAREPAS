import { useState, useEffect, useMemo, useCallback } from 'react';
import { ShieldAlert, Layers } from 'lucide-react';
import { mockPermisos, usePermissions } from '../../../shared/contexts/PermissionContext';
import { Combobox } from '../../../shared/ui/Combobox';
import { Checkbox } from '../../../shared/ui/checkbox';
import { useRolePermissionsForm } from '../hooks/useRolePermissionsForm';
import { StepperModal } from '../../../shared/components/StepperModal';

export function RoleFormModal({ open, onClose, role = null, onSave, isLoading = false }) {
  // ═══════════════════════════════════════════════════════════════
  // 1. TODOS LOS HOOKS DECLARADOS AL INICIO (SIN EARLY RETURNS PREVIOS)
  // ═══════════════════════════════════════════════════════════════
  const { updateRolePermissions } = usePermissions();
  const [nombre, setNombre] = useState('');
  const [estado, setEstado] = useState('Activo');
  const [descripcion, setDescripcion] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  const isAdmin = useMemo(() => {
    return Boolean(
      role && (
        Number(role.id_rol) === 1 ||
        ['administrador', 'admin'].includes(String(role.nombre || '').toLowerCase().trim())
      )
    );
  }, [role]);

  const {
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
    totalSelectedCount,
    totalAvailableCount,
  } = useRolePermissionsForm([], mockPermisos);

  // Reiniciar estado cada vez que se abre el modal o cambia el rol seleccionado
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      if (role) {
        setNombre(role.nombre || '');
        setEstado(isAdmin ? 'Activo' : (role.estado || 'Activo'));
        setDescripcion(role.descripcion || '');
        resetPermissions(role.permisos || []);
      } else {
        setNombre('');
        setEstado('Activo');
        setDescripcion('');
        resetPermissions([]);
      }
    } else {
      // Limpiar al cerrar
      setCurrentStep(0);
    }
  }, [role, open, isAdmin, resetPermissions]);

  const isDirty = useMemo(() => {
    if (!open) return false;
    if (!role) {
      return nombre.trim() !== '' || descripcion.trim() !== '' || selectedPermissions.length > 0;
    }
    return (
      nombre !== (role.nombre || '') ||
      descripcion !== (role.descripcion || '') ||
      estado !== (role.estado || 'Activo')
    );
  }, [open, role, nombre, descripcion, estado, selectedPermissions]);

  // ═══════════════════════════════════════════════════════════════
  // 2. FUNCIONES DE VALIDACIÓN Y ACCIONES
  // ═══════════════════════════════════════════════════════════════
  const validateStep1 = useCallback(() => {
    if (!nombre.trim()) {
      return 'El nombre del rol es obligatorio. Por favor ingresa un nombre para continuar.';
    }
    if (nombre.trim().length < 3) {
      return 'El nombre del rol debe tener al menos 3 caracteres.';
    }
    return true;
  }, [nombre]);

  const handleSubmit = useCallback(() => {
    const step1Validation = validateStep1();
    if (step1Validation !== true) {
      setCurrentStep(0);
      return;
    }

    const validPermIdsSet = new Set(mockPermisos.map((p) => Number(p.id_permiso)));
    const cleanPermissions = Array.from(
      new Set(
        selectedPermissions
          .map(Number)
          .filter((id) => Number.isInteger(id) && id > 0 && validPermIdsSet.has(id))
      )
    );
    const finalEstado = isAdmin ? 'Activo' : (estado || 'Activo');

    const payload = role
      ? {
          ...role,
          nombre: nombre.trim(),
          estado: finalEstado,
          descripcion: descripcion.trim() || null,
          permisos: cleanPermissions,
        }
      : {
          nombre: nombre.trim(),
          estado: finalEstado,
          descripcion: descripcion.trim() || null,
          permisos: cleanPermissions,
        };

    if (role?.id_rol) {
      updateRolePermissions(role.id_rol, cleanPermissions);
    }

    if (onSave) {
      onSave(payload);
    } else {
      onClose();
    }
  }, [validateStep1, selectedPermissions, isAdmin, estado, role, nombre, descripcion, updateRolePermissions, onSave, onClose]);

  // ═══════════════════════════════════════════════════════════════
  // 3. DEFINICIÓN DE PASOS DEL WIZARD
  // ═══════════════════════════════════════════════════════════════
  const steps = useMemo(() => [
    {
      id: 'info',
      title: 'Datos generales',
      description: 'Define la identidad, estado y alcance general del rol',
      validate: validateStep1,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 items-start">
          {/* Nombre del rol */}
          <div className="sm:col-span-2">
            <label htmlFor="rol_nombre" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Nombre del rol <span className="text-destructive font-bold ml-0.5">*</span>
            </label>
            <input
              id="rol_nombre"
              name="nombre"
              type="text"
              maxLength={50}
              autoFocus
              placeholder="Ej. Supervisor de Planta, Gestor de Calidad..."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full h-10 px-4 border border-input bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>

          {/* Descripción */}
          <div className="sm:col-span-2">
            <label htmlFor="rol_descripcion" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Descripción del rol <span className="text-muted-foreground font-normal text-xs">(Opcional)</span>
            </label>
            <textarea
              id="rol_descripcion"
              name="descripcion"
              maxLength={255}
              rows={3}
              placeholder="Describe las responsabilidades y contexto asignado a este rol..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full p-3 border border-input bg-input-background rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none min-h-[75px]"
            />
            <div className="flex justify-between items-center mt-1 text-[11px] text-muted-foreground">
              <span>Define el alcance de este perfil para los demás administradores.</span>
              <span>{descripcion.length}/255</span>
            </div>
          </div>

          {/* Ayuda contextual */}
          <div className="sm:col-span-2 p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-3 text-xs text-muted-foreground">
            <Layers className="size-4 text-[#C1502D] dark:text-[#E8B23D] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-foreground block mb-0.5">Asignación de privilegios</span>
              En el siguiente paso podrás activar o personalizar los 53 permisos del sistema agrupados por módulo.
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'permisos',
      title: 'Permisos',
      description: 'Configura las acciones y niveles de acceso a los módulos',
      content: (
        <div className="space-y-3.5 py-1">
          {/* Barra de Control Superior de Permisos */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                <Layers className="size-4 text-primary" />
                <span>Matriz de Permisos por Módulo</span>
              </h4>
              <p className="text-[11.5px] text-muted-foreground mt-0.5">
                Selecciona las acciones permitidas para cada módulo del sistema.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleGlobalAll()}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border hover:bg-card bg-card/80 text-xs font-semibold text-foreground hover:text-primary transition-all cursor-pointer shadow-2xs select-none"
              >
                <Checkbox
                  id="select_all_permissions_global"
                  checked={isGlobalAllSelected}
                  onCheckedChange={() => toggleGlobalAll()}
                />
                <span>Seleccionar todos</span>
              </button>

              <span className="text-xs font-bold px-3 py-1 bg-[#FFE1D0] dark:bg-[#C1502D]/20 text-[#8C491A] dark:text-[#E8B23D] rounded-full whitespace-nowrap shadow-2xs">
                {totalSelectedCount} de {totalAvailableCount} activos
              </span>
            </div>
          </div>

          {/* Grilla Uniforme de Módulos (2 Columnas con Tarjetas de Mismo Ancho) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[310px] overflow-y-auto pr-1 custom-scrollbar">
            {Object.entries(permissionsByModule).map(([moduleName, modulePermissions]) => {
              const moduleAllSelected = isModuleAllSelected(moduleName);
              const activeCountInModule = modulePermissions.filter((p) =>
                isPermissionSelected(p.id_permiso)
              ).length;

              return (
                <div
                  key={moduleName}
                  className={`border rounded-2xl p-3.5 transition-all flex flex-col justify-between ${
                    activeCountInModule > 0
                      ? 'border-border bg-card shadow-2xs'
                      : 'border-border/60 bg-muted/20 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Cabecera de la Tarjeta del Módulo */}
                  <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-border/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`size-2 rounded-full shrink-0 ${
                          activeCountInModule > 0 ? 'bg-[#C1502D] dark:bg-[#E8B23D]' : 'bg-muted-foreground/40'
                        }`}
                      />
                      <h5 className="font-bold text-xs capitalize text-foreground truncate m-0">
                        {moduleName}
                      </h5>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleModuleAll(moduleName)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer select-none transition-colors"
                      title={`Seleccionar o deseleccionar todos los permisos de ${moduleName}`}
                    >
                      <Checkbox
                        checked={moduleAllSelected}
                        onCheckedChange={() => toggleModuleAll(moduleName)}
                      />
                      <span>Todo</span>
                    </button>
                  </div>

                  {/* Grilla Alineada de Checkboxes de Acciones */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    {modulePermissions.map((permiso) => {
                      const selected = isPermissionSelected(permiso.id_permiso);
                      return (
                        <div
                          key={permiso.id_permiso}
                          onClick={() => togglePermission(permiso.id_permiso)}
                          className={`flex items-center gap-2 p-1.5 rounded-lg text-xs font-medium cursor-pointer select-none transition-colors ${
                            selected
                              ? 'bg-[#FFE1D0]/40 dark:bg-[#C1502D]/15 text-foreground font-semibold'
                              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                          }`}
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => togglePermission(permiso.id_permiso)}
                          />
                          <span className="capitalize text-[11.5px] truncate">{permiso.accion}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Estado del Rol (fila completa, último campo) */}
          <div className="w-full pt-1">
            <label htmlFor="rol_estado" className="block text-xs sm:text-sm font-semibold text-foreground mb-1.5">
              Estado operativo <span className="text-destructive font-bold ml-0.5">*</span>
            </label>
            {isAdmin ? (
              <div className="space-y-1.5">
                <div className="h-10 px-4 rounded-lg border border-border bg-muted/60 text-sm font-medium text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-[#5A7A3A]" />
                    <span>Activo</span>
                  </span>
                  <span className="text-xs bg-primary/10 text-primary font-bold px-2.5 py-0.5 rounded-full">
                    Rol Principal Bloqueado
                  </span>
                </div>
                <p className="text-xs text-[#C1502D] dark:text-[#E8B23D] flex items-center gap-1.5 font-medium">
                  <ShieldAlert className="size-3.5 shrink-0" />
                  El rol Administrador es el eje principal del sistema y no puede desactivarse.
                </p>
              </div>
            ) : (
              <Combobox
                id="rol_estado"
                name="estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                options={[
                  { value: 'Activo', label: 'Activo (Habilitado para asignar usuarios)' },
                  { value: 'Inactivo', label: 'Inactivo (Deshabilitado temporalmente)' },
                ]}
              />
            )}
          </div>
        </div>
      ),
    },
  ], [nombre, estado, descripcion, isAdmin, validateStep1, permissionsByModule, isGlobalAllSelected, toggleGlobalAll, totalSelectedCount, totalAvailableCount, isModuleAllSelected, toggleModuleAll, isPermissionSelected, togglePermission]);

  // StepperModal gestiona internamente si open es false sin romper el orden de hooks
  return (
    <StepperModal
      isOpen={open}
      onClose={onClose}
      category="CONFIGURACIÓN"
      title={role ? 'Editar rol' : 'Nuevo rol'}
      subtitle="Define la identidad y la matriz de permisos de acceso del rol"
      steps={steps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      submitLabel={role ? 'Guardar Cambios' : 'Crear Rol'}
      isDirty={isDirty}
    />
  );
}

export default RoleFormModal;
