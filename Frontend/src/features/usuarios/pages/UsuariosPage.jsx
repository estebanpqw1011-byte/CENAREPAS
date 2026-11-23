import { useState, useMemo, useEffect } from 'react';
import { Lock, Users, UserCheck, ShieldCheck, KeyRound } from 'lucide-react';
import { useUsuarios } from '../hooks/useUsuarios';
import { getRoles } from '../../roles/services/rolesService';
import { DataTable } from '../../../shared/components/DataTable';
import { RowActions } from '../../../shared/components/RowActions';
import { MetricCard } from '../../../shared/components/MetricCard';
import { UsuarioFormModal } from '../components/UsuarioFormModal';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import UsuarioDetailModal from '../components/UsuarioDetailModal';
import PageHeader from '../../../shared/components/PageHeader';
import { usePermissions } from '../../../shared/contexts/PermissionContext';
import StatusSwitch from '../../../shared/components/StatusSwitch';
import { CustomSelect } from '../../../shared/components/CustomSelect';
import ErrorBanner from '../../../shared/components/ErrorBanner';
import { exportToPdf } from '../../../shared/utils/exportToPdf';
import { exportToExcel } from '../../../shared/utils/exportToExcel';

export default function UsuariosPage() {
  const { can } = usePermissions();
  const {
    usuarios,
    rawUsuarios,
    searchTerm,
    setSearchTerm,
    filterRol,
    setFilterRol,
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
    refetch,
    handleSave,
    handleDelete,
    handleRequestStatusChange,
    handleConfirmStatusChange,
  } = useUsuarios();

  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [rolesList, setRolesList] = useState([]);

  useEffect(() => {
    getRoles().then((data) => setRolesList(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  const totalUsuarios = rawUsuarios.length;
  const usuariosActivos = rawUsuarios.filter((u) => String(u.estado).toLowerCase() === 'activo').length;
  const rolesAsignados = new Set(rawUsuarios.map((usuario) => usuario.id_rol)).size;
  const credencialesConfiguradas = rawUsuarios.filter((usuario) => Boolean(usuario.contrasena_hash)).length;
  const roleNames = useMemo(
    () => Object.fromEntries(rolesList.map((role) => [role.id_rol, role.nombre])),
    [rolesList]
  );


  const columns = useMemo(
    () => [
      {
        key: 'id_usuario',
        label: 'ID',
        render: (value) => <span className="font-mono font-medium">{value}</span>,
      },
      {
        key: 'nombre',
        label: 'Nombre',
        render: (value) => <span className="font-semibold">{value}</span>,
      },
      {
        key: 'correo',
        label: 'Correo',
        render: (value) => <span className="text-muted-foreground">{value}</span>,
      },
      {
        key: 'id_rol',
        label: 'Rol',
        render: (value) => (
          <span className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
            {roleNames[value] || 'Rol no encontrado'}
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
        render: (value, usuario) => (
          <StatusSwitch
            value={value}
            disabled={!can('usuarios', 'cambiar_estado')}
            onToggle={() => handleRequestStatusChange(usuario)}
          />
        ),
      },
      {
        key: 'acciones',
        label: 'Acciones',
        render: (_, usuario) => (
          <RowActions
            onView={() => setDetailModal({ isOpen: true, data: usuario })}
            onEdit={() => {
              setSelectedUsuario(usuario);
              setShowModal(true);
            }}
            editDisabled={!can('usuarios', 'editar')}
            onDelete={() =>
              setDeleteDialog({
                isOpen: true,
                id: usuario.id_usuario,
                nombre: usuario.nombre,
              })
            }
            deleteDisabled={!can('usuarios', 'eliminar')}
            extra={
              <button
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all duration-150"
                title="Cambiar contraseña"
                onClick={() => {
                  setSelectedUsuario(usuario);
                  setShowModal(true);
                }}
              >
                <Lock className="w-4 h-4" />
              </button>
            }
          />
        ),
      },
    ],
    [can, roleNames, setDetailModal, setShowModal, setDeleteDialog, handleRequestStatusChange]
  );

  const handleExportPdf = () => {
    exportToPdf({
      data: filteredData,
      columns: [
        { header: 'ID', key: 'id_usuario' },
        { header: 'Nombre', key: 'nombre' },
        { header: 'Correo Electrónico', key: 'correo' },
        { header: 'Rol', accessor: (u) => roleNames[u.id_rol] || 'Sin rol' },
        { header: 'Fecha de Creación', key: 'fecha_creacion' },
        { header: 'Estado', key: 'estado' },
      ],
      title: 'Reporte de Usuarios',
      subtitle: 'Listado de usuarios registrados en el sistema CENAREPAS',
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      data: filteredData,
      columns: [
        { header: 'ID', key: 'id_usuario', align: 'center' },
        { header: 'Nombre Completo', key: 'nombre' },
        { header: 'Correo Electrónico', key: 'correo' },
        { header: 'Rol Asignado', accessor: (u) => roleNames[u.id_rol] || 'Sin rol' },
        { header: 'Fecha de Creación', key: 'fecha_creacion', align: 'center' },
        { header: 'Estado', key: 'estado', align: 'center' },
      ],
      title: 'Reporte de Usuarios',
      subtitle: 'Listado de usuarios registrados en el sistema CENAREPAS',
      sheetName: 'Usuarios',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuarios"
        subtitle="Gestión de usuarios y accesos del sistema Masarepas"
        addLabel="Nuevo Usuario"
        addDisabled={!can('usuarios', 'crear')}
        onAdd={() => {
          setSelectedUsuario(null);
          setShowModal(true);
        }}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
      />

      {/* Tarjetas de Consolidado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
        <MetricCard index={0} title="Total Usuarios" value={totalUsuarios} icon={Users} variant="primary" />
        <MetricCard index={1} title="Roles Asignados" value={rolesAsignados} icon={ShieldCheck} variant="accent" />
        <MetricCard index={2} title="Credenciales Configuradas" value={credencialesConfiguradas} icon={KeyRound} variant="warning" />
        <MetricCard index={3} title="Usuarios Activos" value={usuariosActivos} icon={UserCheck} variant="success" />
      </div>

      <ErrorBanner message={loadError} onRetry={refetch} />

      {/* Tabla con DataTable */}
      <DataTable
        columns={columns}
        data={usuarios}
        isLoading={isLoading}
        emptyIcon={Users}
        entityName="usuarios"
        onAdd={() => {
          setSelectedUsuario(null);
          setShowModal(true);
        }}
        addLabel="Nuevo Usuario"
        addDisabled={!can('usuarios', 'crear')}
        isFiltered={Boolean(searchTerm || filterRol !== 'Todos los roles' || filterEstado !== 'Todos los estados')}
        searchPlaceholder="Buscar usuario por nombre o correo..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filters={
          <>
            <CustomSelect
              value={filterRol}
              onChange={(e) => setFilterRol(e.target.value)}
              className="w-full sm:w-56"
            >
              <option value="Todos los roles">Todos los roles</option>
              <option value="1">Administrador de Planta</option>
              <option value="2">Supervisor de Producción</option>
              <option value="3">Gestor de Compras y Proveedores</option>
              <option value="4">Vendedor y Distribución</option>
              <option value="5">Auditor de Calidad</option>
            </CustomSelect>
            <CustomSelect
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="w-full sm:w-48"
            >
              <option value="Todos los estados">Todos los estados</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </CustomSelect>
          </>
        }
      />

      <UsuarioDetailModal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, data: null })}
        usuario={detailModal.data}
        roleNames={roleNames}
      />

      <UsuarioFormModal
        open={showModal}
        usuario={selectedUsuario}
        onSave={handleSave}
        isLoading={isSaving}
        onClose={() => {
          setShowModal(false);
          setSelectedUsuario(null);
        }}
      />

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Eliminar Usuario"
        message={`¿Estás seguro de que deseas eliminar al usuario "${deleteDialog.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null, nombre: '' })}
        isLoading={isDeleting}
      />

      {/* Modal de confirmación para Cambio de Estado */}
      <ConfirmDialog
        isOpen={statusDialog.isOpen}
        title={`Cambiar Estado a ${statusDialog.nextEstado}`}
        message={`¿Estás seguro de que deseas cambiar el estado del usuario "${statusDialog.usuario?.nombre}" de ${statusDialog.usuario?.estado || 'Activo'} a ${statusDialog.nextEstado}?`}
        confirmText={`Cambiar a ${statusDialog.nextEstado}`}
        confirmVariant={statusDialog.nextEstado === 'Activo' ? 'success' : 'warning'}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setStatusDialog({ isOpen: false, usuario: null, nextEstado: 'Activo' })}
        isLoading={isUpdatingStatus}
        loadingText="Cambiando estado…"
      />
    </div>
  );
}

