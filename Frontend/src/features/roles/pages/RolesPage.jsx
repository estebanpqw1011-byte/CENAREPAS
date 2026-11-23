import { useState, useMemo } from 'react';
import { Shield, ShieldCheck, KeyRound, ListChecks } from 'lucide-react';
import { useRoles } from '../hooks/useRoles';
import { DataTable } from '../../../shared/components/DataTable';
import { RowActions } from '../../../shared/components/RowActions';
import { MetricCard } from '../../../shared/components/MetricCard';
import { RoleFormModal } from '../components/RoleFormModal';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import RoleDetailModal from '../components/RoleDetailModal';
import PageHeader from '../../../shared/components/PageHeader';
import { usePermissions, mockPermisos } from '../../../shared/contexts/PermissionContext';
import StatusSwitch from '../../../shared/components/StatusSwitch';
import { CustomSelect } from '../../../shared/components/CustomSelect';
import ErrorBanner from '../../../shared/components/ErrorBanner';
import { exportToPdf } from '../../../shared/utils/exportToPdf';
import { exportToExcel } from '../../../shared/utils/exportToExcel';

export default function RolesPage() {
  const { can } = usePermissions();
  const {
    rawRoles,
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
    refetch,
    handleSave,
    handleDelete,
    handleRequestStatusChange,
    handleConfirmStatusChange,
  } = useRoles();

  const [selectedRole, setSelectedRole] = useState(null);

  const totalRoles = rawRoles.length;
  const rolesActivos = rawRoles.filter((r) => String(r.estado).toLowerCase() === 'activo').length;
  const permisosDisponibles = mockPermisos.length;
  const rolesConfigurados = rawRoles.filter((role) => String(role.estado).toLowerCase() === 'activo').length;

  const filteredData = useMemo(() => {
    return rawRoles.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.nombre.toLowerCase().includes(q) ||
        (r.descripcion || '').toLowerCase().includes(q);

      const isTodosEstado = estadoFilter === 'Todos' || estadoFilter === 'Todos los estados';
      const matchesEstado =
        isTodosEstado || String(r.estado).toLowerCase() === estadoFilter.toLowerCase();

      return matchesSearch && matchesEstado;
    });
  }, [rawRoles, searchQuery, estadoFilter]);

  const columns = useMemo(
    () => [
      {
        key: 'id_rol',
        label: 'ID',
        render: (value) => <span className="font-mono font-medium">{value}</span>,
      },
      {
        key: 'nombre',
        label: 'Nombre del Rol',
        render: (value, rol) => {
          const isRolAdmin = Number(rol?.id_rol) === 1 || ['administrador', 'admin'].includes(String(rol?.nombre || '').toLowerCase().trim());
          return (
            <div className="flex items-center gap-2">
              <span className="font-semibold">{value}</span>
              {isRolAdmin && (
                <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md border border-primary/20">
                  Sistema
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'descripcion',
        label: 'Descripción',
        render: (value) => (
          <span className="text-muted-foreground max-w-xs truncate block" title={value}>
            {value}
          </span>
        ),
      },
      {
        key: 'fecha_creacion',
        label: 'Fecha de Creación',
        render: (value) => <span className="text-muted-foreground">{value}</span>,
      },
      {
        key: 'estado',
        label: 'Estado',
        render: (value, rol) => {
          const isRolAdmin = Number(rol?.id_rol) === 1 || ['administrador', 'admin'].includes(String(rol?.nombre || '').toLowerCase().trim());
          return (
            <div
              className="inline-flex items-center"
              title={isRolAdmin ? 'El rol Administrador es principal del sistema y no puede ser desactivado' : undefined}
            >
              <StatusSwitch
                value={value}
                disabled={isRolAdmin || !can('roles', 'cambiar_estado')}
                onToggle={() => {
                  if (isRolAdmin) {
                    return;
                  }
                  handleRequestStatusChange(rol);
                }}
              />
            </div>
          );
        },
      },
      {
        key: 'acciones',
        label: 'Acciones',
        render: (_, rol) => {
          const isRolAdmin = Number(rol?.id_rol) === 1 || ['administrador', 'admin'].includes(String(rol?.nombre || '').toLowerCase().trim());
          return (
            <RowActions
              onView={() => setDetailModal({ isOpen: true, data: rol })}
              onEdit={() => {
                setSelectedRole(rol);
                setShowModal(true);
              }}
              editDisabled={!can('roles', 'editar')}
              onDelete={() => {
                if (isRolAdmin) {
                  return;
                }
                setDeleteDialog({
                  isOpen: true,
                  id: rol.id_rol,
                  nombre: rol.nombre,
                });
              }}
              deleteDisabled={isRolAdmin || !can('roles', 'eliminar')}
            />
          );
        },
      },
    ],
    [can, setDetailModal, setShowModal, setDeleteDialog, handleRequestStatusChange]
  );

  const handleExportPdf = () => {
    exportToPdf({
      data: filteredData,
      columns: [
        { header: 'ID', key: 'id_rol' },
        { header: 'Nombre del Rol', key: 'nombre' },
        { header: 'Descripción', key: 'descripcion' },
        { header: 'Fecha Creación', key: 'fecha_creacion' },
        { header: 'Estado', key: 'estado' },
      ],
      title: 'Reporte de Roles y Permisos',
      subtitle: 'Listado de roles configurados en el sistema CENAREPAS',
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      data: filteredData,
      columns: [
        { header: 'ID', key: 'id_rol', align: 'center' },
        { header: 'Nombre del Rol', key: 'nombre' },
        { header: 'Descripción', key: 'descripcion' },
        { header: 'Fecha de Creación', key: 'fecha_creacion', align: 'center' },
        { header: 'Estado', key: 'estado', align: 'center' },
      ],
      title: 'Reporte de Roles y Permisos',
      subtitle: 'Listado de roles configurados en el sistema CENAREPAS',
      sheetName: 'Roles',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles y Permisos"
        subtitle="Gestión de roles y niveles de acceso en Masarepas"
        addLabel="Nuevo Rol"
        addDisabled={!can('roles', 'crear')}
        onAdd={() => {
          setSelectedRole(null);
          setShowModal(true);
        }}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
      />

      {/* Tarjetas de consolidado / métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
        <MetricCard index={0} title="Total Roles" value={totalRoles} icon={Shield} variant="primary" />
        <MetricCard index={1} title="Permisos Disponibles" value={permisosDisponibles} icon={KeyRound} variant="accent" />
        <MetricCard index={2} title="Roles Configurados" value={rolesConfigurados} icon={ListChecks} variant="warning" />
        <MetricCard index={3} title="Roles Activos" value={rolesActivos} icon={ShieldCheck} variant="success" />
      </div>

      <ErrorBanner message={loadError} onRetry={refetch} />

      {/* Tabla con DataTable */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        emptyIcon={Shield}
        entityName="roles"
        onAdd={() => {
          setSelectedRole(null);
          setShowModal(true);
        }}
        addLabel="Nuevo Rol"
        addDisabled={!can('roles', 'crear')}
        isFiltered={Boolean(searchQuery || estadoFilter !== 'Todos')}
        searchPlaceholder="Buscar por nombre o descripción..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={
          <CustomSelect
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="w-full sm:w-48"
          >
            <option value="Todos">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </CustomSelect>
        }
      />

      <RoleDetailModal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, data: null })}
        role={detailModal.data}
      />

      <RoleFormModal
        open={showModal}
        role={selectedRole}
        onSave={handleSave}
        isLoading={isSaving}
        onClose={() => {
          setShowModal(false);
          setSelectedRole(null);
        }}
      />

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Eliminar Rol"
        message={`¿Estás seguro de que deseas eliminar el rol "${deleteDialog.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null, nombre: '' })}
        isLoading={isDeleting}
      />

      {/* Modal de confirmación para Cambio de Estado */}
      <ConfirmDialog
        isOpen={statusDialog.isOpen}
        title={`Cambiar Estado a ${statusDialog.nextEstado}`}
        message={`¿Estás seguro de que deseas cambiar el estado del rol "${statusDialog.rol?.nombre}" de ${statusDialog.rol?.estado || 'Activo'} a ${statusDialog.nextEstado}?`}
        confirmText={`Cambiar a ${statusDialog.nextEstado}`}
        confirmVariant={statusDialog.nextEstado === 'Activo' ? 'success' : 'warning'}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setStatusDialog({ isOpen: false, rol: null, nextEstado: 'Activo' })}
        isLoading={isUpdatingStatus}
        loadingText="Cambiando estado…"
      />
    </div>
  );
}


