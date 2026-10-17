import { useState, useMemo } from 'react';
import { FolderTree, CheckCircle, Package, Layers } from 'lucide-react';
import { useCategorias } from '../hooks/useCategorias';
import { DataTable } from '../../../shared/components/DataTable';
import { RowActions } from '../../../shared/components/RowActions';
import { CategoriaFormModal } from '../components/CategoriaFormModal';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import PageHeader from '../../../shared/components/PageHeader';
import { MetricCard } from '../../../shared/components/MetricCard';
import { usePermissions } from '../../../shared/contexts/PermissionContext';
import StatusSwitch from '../../../shared/components/StatusSwitch';
import { CustomSelect } from '../../../shared/components/CustomSelect';
import ErrorBanner from '../../../shared/components/ErrorBanner';
import { exportToPdf } from '../../../shared/utils/exportToPdf';
import { exportToExcel } from '../../../shared/utils/exportToExcel';

export default function CategoriasPage() {
  const { can } = usePermissions();
  const {
    rawCategorias,
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
  } = useCategorias();

  const [selectedCategoria, setSelectedCategoria] = useState(null);

  const totalCategorias = rawCategorias.length;
  const activas = rawCategorias.filter((c) => String(c.estado).toLowerCase() === 'activo').length;
  const totalProductosAsignados = 0;
  const promedioProductos = totalCategorias > 0 ? (totalProductosAsignados / totalCategorias).toFixed(1) : 0;

  const filteredData = useMemo(() => {
    return rawCategorias.filter((c) => {
      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.nombre.toLowerCase().includes(q) ||
        String(c.id_categoria).toLowerCase().includes(q) ||
        (c.descripcion || '').toLowerCase().includes(q);

      const isTodos = estadoFilter === 'Todos' || estadoFilter === 'Todos los estados';
      const matchesEstado = isTodos || String(c.estado).toLowerCase() === estadoFilter.toLowerCase();
      return matchesSearch && matchesEstado;
    });
  }, [rawCategorias, searchQuery, estadoFilter]);

  const columns = useMemo(
    () => [
      {
        key: 'id_categoria',
        label: 'ID',
        render: (value) => <span className="font-mono font-medium">{value}</span>,
      },
      {
        key: 'nombre',
        label: 'Nombre Categoría',
        render: (value) => <span className="font-semibold">{value}</span>,
      },
      {
        key: 'descripcion',
        label: 'Descripción',
        render: (value) => <span className="text-muted-foreground max-w-xs truncate block">{value}</span>,
      },
      {
        key: 'estado',
        label: 'Estado',
        render: (value, categoria) => (
          <StatusSwitch
            value={value}
            disabled={!can('categorias', 'editar')}
            onToggle={() => handleRequestStatusChange(categoria)}
          />
        ),
      },
      {
        key: 'acciones',
        label: 'Acciones',
        render: (_, categoria) => (
          <RowActions
            onView={() => setDetailModal({ isOpen: true, data: categoria })}
            onEdit={() => {
              setSelectedCategoria(categoria);
              setShowModal(true);
            }}
            editDisabled={!can('categorias', 'editar')}
            onDelete={() =>
              setDeleteDialog({
                isOpen: true,
                id: categoria.id_categoria,
                nombre: categoria.nombre,
              })
            }
            deleteDisabled={!can('categorias', 'eliminar')}
          />
        ),
      },
    ],
    [can, setDetailModal, setShowModal, setDeleteDialog, handleRequestStatusChange]
  );

  const handleExportPdf = () => {
    exportToPdf({
      data: filteredData,
      columns: [
        { header: 'ID', key: 'id_categoria' },
        { header: 'Nombre Categoría', key: 'nombre' },
        { header: 'Descripción', key: 'descripcion' },
        { header: 'Estado', key: 'estado' },
      ],
      title: 'Reporte de Categorías de Productos',
      subtitle: 'Clasificación de productos y líneas de producción en CENAREPAS',
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      data: filteredData,
      columns: [
        { header: 'ID', key: 'id_categoria', align: 'center' },
        { header: 'Categoría', key: 'nombre' },
        { header: 'Descripción', key: 'descripcion' },
        { header: 'Estado', key: 'estado', align: 'center' },
      ],
      title: 'Reporte de Categorías de Productos',
      subtitle: 'Clasificación de productos y líneas de producción en CENAREPAS',
      sheetName: 'Categorias',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías de Productos"
        subtitle="Clasificación de arepas y subproductos de fábrica"
        addLabel="Nueva Categoría"
        addDisabled={!can('categorias', 'crear')}
        onAdd={() => {
          setSelectedCategoria(null);
          setShowModal(true);
        }}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
      />

      {/* Tarjetas de Consolidado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
        <MetricCard index={0} title="Total Categorías" value={totalCategorias} icon={FolderTree} variant="primary" />
        <MetricCard index={1} title="Categorías Activas" value={activas} icon={CheckCircle} variant="success" />
        <MetricCard index={2} title="Prod. Clasificados" value={totalProductosAsignados} icon={Package} variant="accent" />
        <MetricCard index={3} title="Promedio Prod/Cat" value={promedioProductos} icon={Layers} variant="warning" />
      </div>

      <ErrorBanner message={loadError} onRetry={refetch} />

      {/* Tabla con DataTable y RowActions */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        emptyIcon={FolderTree}
        entityName="categorías"
        onAdd={() => {
          setSelectedCategoria(null);
          setShowModal(true);
        }}
        addLabel="Nueva Categoría"
        addDisabled={!can('categorias', 'crear')}
        isFiltered={Boolean(searchQuery || estadoFilter !== 'Todos')}
        searchPlaceholder="Buscar por código, nombre o descripción..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={
          <CustomSelect
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="w-full sm:w-48"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </CustomSelect>
        }
      />

      {/* Ver detalle: el mismo formulario que crear y editar, en modo de solo lectura */}
      <CategoriaFormModal
        open={detailModal.isOpen}
        categoria={detailModal.data}
        modo="ver"
        onClose={() => setDetailModal({ isOpen: false, data: null })}
      />

      <CategoriaFormModal
        open={showModal}
        categoria={selectedCategoria}
        onSave={handleSave}
        isLoading={isSaving}
        onClose={() => {
          setShowModal(false);
          setSelectedCategoria(null);
        }}
      />

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Eliminar Categoría"
        message={`¿Estás seguro de que deseas eliminar la categoría "${deleteDialog.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null, nombre: '' })}
        isLoading={isDeleting}
      />

      {/* Modal de confirmación para Cambio de Estado */}
      <ConfirmDialog
        isOpen={statusDialog.isOpen}
        title={`Cambiar Estado a ${statusDialog.nextEstado}`}
        message={`¿Estás seguro de que deseas cambiar el estado de la categoría "${statusDialog.categoria?.nombre}" de ${statusDialog.categoria?.estado || 'Activo'} a ${statusDialog.nextEstado}?`}
        confirmText={`Cambiar a ${statusDialog.nextEstado}`}
        confirmVariant={statusDialog.nextEstado === 'Activo' ? 'success' : 'warning'}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setStatusDialog({ isOpen: false, categoria: null, nextEstado: 'Activo' })}
        isLoading={isUpdatingStatus}
        loadingText="Cambiando estado…"
      />
    </div>
  );
}


