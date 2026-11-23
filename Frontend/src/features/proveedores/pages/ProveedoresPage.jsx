import { useState, useMemo, useEffect } from 'react';
import { Truck, CheckCircle, Clock, Package } from 'lucide-react';
import { useProveedores } from '../hooks/useProveedores';
import { getInsumos } from '../../insumos/services/insumosService';
import { DataTable } from '../../../shared/components/DataTable';
import { RowActions } from '../../../shared/components/RowActions';
import { MetricCard } from '../../../shared/components/MetricCard';
import { ProveedorFormModal } from '../components/ProveedorFormModal';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import PageHeader from '../../../shared/components/PageHeader';
import { usePermissions } from '../../../shared/contexts/PermissionContext';
import StatusSwitch from '../../../shared/components/StatusSwitch';
import { CustomSelect } from '../../../shared/components/CustomSelect';
import ErrorBanner from '../../../shared/components/ErrorBanner';
import { exportToPdf } from '../../../shared/utils/exportToPdf';
import { exportToExcel } from '../../../shared/utils/exportToExcel';
import { documentoTexto } from '../../../shared/utils/persona';

export default function ProveedoresPage() {
  const { can } = usePermissions();
  const {
    proveedores,
    rawProveedores,
    searchTerm,
    setSearchTerm,
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
  } = useProveedores();

  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [insumosCount, setInsumosCount] = useState(0);

  useEffect(() => {
    getInsumos().then((data) => {
      if (Array.isArray(data)) setInsumosCount(data.length);
    }).catch(() => {});
  }, []);


  const totalProveedores = rawProveedores.length;
  const activos = rawProveedores.filter((p) => String(p.estado).toLowerCase() === 'activo').length;
  const inactivos = totalProveedores - activos;

  const columns = useMemo(
    () => [
      {
        key: 'nit',
        label: 'Documento',
        render: (value, proveedor) => (
          <span className="font-mono text-muted-foreground whitespace-nowrap">{documentoTexto(proveedor.tipo_documento, value)}</span>
        ),
      },
      {
        key: 'nombre',
        label: 'Nombre / Razón social',
        render: (value) => <span className="font-semibold">{value}</span>,
      },
      {
        key: 'telefono',
        label: 'Teléfono',
        render: (value) => <span className="text-muted-foreground">{value || '—'}</span>,
      },
      {
        key: 'correo',
        label: 'Correo',
        render: (value) => <span className="text-muted-foreground">{value || '—'}</span>,
      },
      {
        key: 'estado',
        label: 'Estado',
        render: (value, proveedor) => (
          <StatusSwitch
            value={value}
            disabled={!can('proveedores', 'cambiar_estado')}
            onToggle={() => handleRequestStatusChange(proveedor)}
          />
        ),
      },
      {
        key: 'acciones',
        label: 'Acciones',
        render: (_, proveedor) => (
          <RowActions
            onView={() => setDetailModal({ isOpen: true, data: proveedor })}
            onEdit={() => {
              setSelectedProveedor(proveedor);
              setShowModal(true);
            }}
            editDisabled={!can('proveedores', 'editar')}
            onDelete={() =>
              setDeleteDialog({
                isOpen: true,
                id: proveedor.id_proveedor,
                nombre: proveedor.nombre,
              })
            }
            deleteDisabled={!can('proveedores', 'eliminar')}
          />
        ),
      },
    ],
    [can, setDetailModal, setShowModal, setDeleteDialog, handleRequestStatusChange]
  );

  const handleExportPdf = () => {
    exportToPdf({
      data: proveedores,
      columns: [
        { header: 'ID', key: 'id_proveedor' },
        { header: 'Tipo de persona', key: 'tipo_persona' },
        { header: 'Documento', accessor: (p) => documentoTexto(p.tipo_documento, p.nit) },
        { header: 'Nombre / Razón social', key: 'nombre' },
        { header: 'Teléfono', key: 'telefono' },
        { header: 'Correo', key: 'correo' },
        { header: 'Dirección', key: 'direccion' },
        { header: 'Fecha de Creación', key: 'fecha_creacion' },
        { header: 'Estado', key: 'estado' },
      ],
      title: 'Reporte de Proveedores',
      subtitle: 'Directorio de proveedores registrados en CENAREPAS',
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      data: proveedores,
      columns: [
        { header: 'ID', key: 'id_proveedor', align: 'center' },
        { header: 'Tipo de persona', key: 'tipo_persona' },
        { header: 'Documento', accessor: (p) => documentoTexto(p.tipo_documento, p.nit), align: 'center' },
        { header: 'Nombre / Razón social', key: 'nombre' },
        { header: 'Teléfono', key: 'telefono' },
        { header: 'Correo Electrónico', key: 'correo' },
        { header: 'Dirección', key: 'direccion' },
        { header: 'Fecha de Creación', key: 'fecha_creacion', align: 'center' },
        { header: 'Estado', key: 'estado', align: 'center' },
      ],
      title: 'Reporte de Proveedores',
      subtitle: 'Directorio de proveedores registrados en CENAREPAS',
      sheetName: 'Proveedores',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proveedores"
        subtitle="Directorio de proveedores de materias primas e insumos de Masarepas"
        addLabel="Nuevo Proveedor"
        addDisabled={!can('proveedores', 'crear')}
        onAdd={() => {
          setSelectedProveedor(null);
          setShowModal(true);
        }}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
      />

      {/* Tarjetas de Consolidado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
        <MetricCard index={0} title="Total Proveedores" value={totalProveedores} icon={Truck} variant="primary" />
        <MetricCard index={1} title="Proveedores Activos" value={activos} icon={CheckCircle} variant="success" />
        <MetricCard index={2} title="Inactivos" value={inactivos} icon={Clock} variant="warning" />
        <MetricCard index={3} title="Insumos Suministrados" value={insumosCount} icon={Package} variant="accent" />
      </div>

      <ErrorBanner message={loadError} onRetry={refetch} />

      {/* Tabla con DataTable */}
      <DataTable
        columns={columns}
        data={proveedores}
        isLoading={isLoading}
        emptyIcon={Truck}
        entityName="proveedores"
        onAdd={() => {
          setSelectedProveedor(null);
          setShowModal(true);
        }}
        addLabel="Nuevo Proveedor"
        addDisabled={!can('proveedores', 'crear')}
        isFiltered={Boolean(searchTerm || filterEstado !== 'Todos los estados')}
        searchPlaceholder="Buscar por nombre, documento o correo..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filters={
          <CustomSelect
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="w-full sm:w-48"
          >
            <option value="Todos los estados">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </CustomSelect>
        }
      />

      <ProveedorFormModal
        modo="ver"
        open={detailModal.isOpen}
        proveedor={detailModal.data}
        onClose={() => setDetailModal({ isOpen: false, data: null })}
      />

      <ProveedorFormModal
        open={showModal}
        proveedor={selectedProveedor}
        onSave={handleSave}
        isLoading={isSaving}
        onClose={() => {
          setShowModal(false);
          setSelectedProveedor(null);
        }}
      />

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Eliminar Proveedor"
        message={`¿Estás seguro de que deseas eliminar al proveedor "${deleteDialog.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null, nombre: '' })}
        isLoading={isDeleting}
      />

      {/* Modal de confirmación para Cambio de Estado */}
      <ConfirmDialog
        isOpen={statusDialog.isOpen}
        title={`Cambiar Estado a ${statusDialog.nextEstado}`}
        message={`¿Estás seguro de que deseas cambiar el estado del proveedor "${statusDialog.proveedor?.nombre}" de ${statusDialog.proveedor?.estado || 'Activo'} a ${statusDialog.nextEstado}?`}
        confirmText={`Cambiar a ${statusDialog.nextEstado}`}
        confirmVariant={statusDialog.nextEstado === 'Activo' ? 'success' : 'warning'}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setStatusDialog({ isOpen: false, proveedor: null, nextEstado: 'Activo' })}
        isLoading={isUpdatingStatus}
        loadingText="Cambiando estado…"
      />
    </div>
  );
}


