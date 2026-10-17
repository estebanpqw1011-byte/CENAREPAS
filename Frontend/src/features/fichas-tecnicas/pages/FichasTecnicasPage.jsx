import { useState, useMemo } from 'react';
import { BookOpen, CheckCircle, FileText, Clock } from 'lucide-react';
import { useFichasTecnicas } from '../hooks/useFichasTecnicas';
import { mockFichaTecnicaInsumos } from '../services/fichasTecnicasService';
import { mockInsumos } from '../../insumos/services/insumosService';
import { DataTable } from '../../../shared/components/DataTable';
import { RowActions } from '../../../shared/components/RowActions';
import { FichaTecnicaFormModal } from '../components/FichaTecnicaFormModal';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import DetailModal from '../../../shared/components/DetailModal';
import PageHeader from '../../../shared/components/PageHeader';
import { MetricCard } from '../../../shared/components/MetricCard';
import { usePermissions } from '../../../shared/contexts/PermissionContext';
import StatusSwitch from '../../../shared/components/StatusSwitch';
import { CustomSelect } from '../../../shared/components/CustomSelect';
import ErrorBanner from '../../../shared/components/ErrorBanner';
import { exportToPdf } from '../../../shared/utils/exportToPdf';
import { exportToExcel } from '../../../shared/utils/exportToExcel';

export default function FichasTecnicasPage() {
  const { can } = usePermissions();
  const {
    rawFichas,
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
  } = useFichasTecnicas();

  const [selectedFicha, setSelectedFicha] = useState(null);

  const getFichaInsumosList = (ficha) => {
    if (!ficha) return [];
    if (Array.isArray(ficha.insumos) && ficha.insumos.length > 0) {
      return ficha.insumos;
    }
    const fromMock = mockFichaTecnicaInsumos.filter((fi) => fi.id_ficha === ficha.id_ficha);
    if (fromMock.length > 0) {
      return fromMock.map((fi) => {
        const ins = mockInsumos.find((i) => i.id_insumo === fi.id_insumo);
        return {
          id_insumo: fi.id_insumo,
          nombre: ins?.nombre || `Insumo #${fi.id_insumo}`,
          cantidad: fi.cantidad,
          unidad_medida: fi.unidad_medida || ins?.unidad_medida || 'kg',
        };
      });
    }
    return [];
  };

  const totalFichas = rawFichas.length;
  const vigentes = rawFichas.filter(
    (f) => String(f.estado).toLowerCase() === 'vigente' || String(f.estado).toLowerCase() === 'activo'
  ).length;

  const filteredData = useMemo(() => {
    return rawFichas.filter((f) => {
      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch =
        !q ||
        f.nombre.toLowerCase().includes(q) ||
        String(f.id_ficha).toLowerCase().includes(q) ||
        (f.descripcion || '').toLowerCase().includes(q);

      const isTodos = estadoFilter === 'Todos' || estadoFilter === 'Todos los estados';
      const matchesEstado = isTodos || String(f.estado).toLowerCase() === estadoFilter.toLowerCase();
      return matchesSearch && matchesEstado;
    });
  }, [rawFichas, searchQuery, estadoFilter]);

  const columns = useMemo(
    () => [
      {
        key: 'id_ficha',
        label: 'Código',
        render: (value) => <span className="font-mono font-medium">{value}</span>,
      },
      {
        key: 'nombre',
        label: 'Producto Estándar',
        render: (value) => <span className="font-semibold">{value}</span>,
      },
      {
        key: 'tiempo_estimado_minutos',
        label: 'Tiempo (min)',
        render: (value) => `${value} min`,
      },
      {
        key: 'rendimiento_lote',
        label: 'Rendimiento Esperado',
        render: (value) => `${value} und`,
      },
      {
        key: 'descripcion',
        label: 'Insumos Clave / Descripción',
        render: (value) => <span className="text-muted-foreground max-w-xs truncate block">{value}</span>,
      },
      {
        key: 'estado',
        label: 'Estado',
        render: (value, ficha) => (
          <StatusSwitch
            value={value}
            disabled={!can('fichas-tecnicas', 'cambiar_estado')}
            onToggle={() => handleRequestStatusChange(ficha)}
          />
        ),
      },
      {
        key: 'acciones',
        label: 'Acciones',
        render: (_, ficha) => (
          <RowActions
            onView={() => setDetailModal({ isOpen: true, data: ficha })}
            onEdit={() => {
              setSelectedFicha(ficha);
              setShowModal(true);
            }}
            editDisabled={!can('fichas-tecnicas', 'editar')}
            onDelete={() =>
              setDeleteDialog({
                isOpen: true,
                id: ficha.id_ficha,
                nombre: ficha.nombre,
              })
            }
            deleteDisabled={!can('fichas-tecnicas', 'eliminar')}
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
        { header: 'ID', key: 'id_ficha' },
        { header: 'Nombre Receta', key: 'nombre' },
        {
          header: 'Rendimiento',
          accessor: (f) => `${f.rendimiento_lote || 0} und/lote`,
        },
        {
          header: 'Tiempo Prep.',
          accessor: (f) => `${f.tiempo_estimado_minutos || 0} min`,
        },
        { header: 'Estado', key: 'estado' },
      ],
      title: 'Reporte de Fichas Técnicas (Recetas)',
      subtitle: 'Estándares de producción, tiempos y formulaciones en CENAREPAS',
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      data: filteredData,
      columns: [
        { header: 'ID', key: 'id_ficha', align: 'center' },
        { header: 'Nombre de la Receta', key: 'nombre' },
        {
          header: 'Rendimiento por Lote',
          accessor: (f) => `${f.rendimiento_lote || 0} und`,
          align: 'right',
        },
        {
          header: 'Tiempo Estimado (min)',
          accessor: (f) => f.tiempo_estimado_minutos || 0,
          align: 'right',
        },
        { header: 'Descripción', key: 'descripcion' },
        { header: 'Estado', key: 'estado', align: 'center' },
      ],
      title: 'Reporte de Fichas Técnicas (Recetas)',
      subtitle: 'Estándares de producción, tiempos y formulaciones en CENAREPAS',
      sheetName: 'Fichas_Tecnicas',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fichas Técnicas (Recetas)"
        subtitle="Formulaciones, rendimientos y estándar de calidad de Masarepas"
        addLabel="Nueva Ficha Técnica"
        addDisabled={!can('fichas-tecnicas', 'crear')}
        onAdd={() => {
          setSelectedFicha(null);
          setShowModal(true);
        }}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
      />

      {/* Tarjetas de Consolidado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
        <MetricCard index={0} title="Total Recetas" value={totalFichas} icon={BookOpen} variant="primary" />
        <MetricCard index={1} title="Fichas Vigentes" value={vigentes} icon={CheckCircle} variant="success" />
        <MetricCard index={2} title="Versión Actual" value="v3.0 Max" icon={FileText} variant="accent" />
        <MetricCard index={3} title="Última Revisión" value="Hace 15 días" icon={Clock} variant="warning" />
      </div>

      <ErrorBanner message={loadError} onRetry={refetch} />

      {/* Tabla con DataTable */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        emptyIcon={BookOpen}
        entityName="fichas técnicas"
        onAdd={() => {
          setSelectedFicha(null);
          setShowModal(true);
        }}
        addLabel="Nueva Ficha"
        addDisabled={!can('fichas-tecnicas', 'crear')}
        isFiltered={Boolean(searchQuery || estadoFilter !== 'Todos')}
        searchPlaceholder="Buscar por código, producto o insumos..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={
          <CustomSelect
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="w-full sm:w-48"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Vigente">Vigente / Activo</option>
            <option value="Inactivo">Inactivo / En Revisión</option>
          </CustomSelect>
        }
      />

      <DetailModal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, data: null })}
        title="Detalle de Ficha Técnica"
        fields={detailModal.data ? [
          { label: 'Código Receta', value: `#${detailModal.data.id_ficha}` },
          { label: 'Nombre', value: detailModal.data.nombre },
          { label: 'Descripción', value: detailModal.data.descripcion || 'N/A' },
          { label: 'Rendimiento por Lote', value: `${detailModal.data.rendimiento_lote} und` },
          { label: 'Tiempo Estimado', value: `${detailModal.data.tiempo_estimado_minutos} min` },
          {
            label: 'Insumos Requeridos',
            value: (() => {
              const list = getFichaInsumosList(detailModal.data);
              if (!list || list.length === 0) return 'Sin insumos especificados';
              return (
                <div className="space-y-1 w-full text-left">
                  {list.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 text-xs bg-card p-1.5 rounded border border-border/50">
                      <span className="font-medium text-foreground">{item.insumo_nombre}</span>
                      <span className="font-semibold text-primary px-2 py-0.5 bg-primary/10 rounded">
                        {item.cantidad} {item.unidad_medida}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })(),
          },
          { label: 'Instrucciones de Preparación', value: detailModal.data.instrucciones_preparacion || 'N/A' },
          { label: 'Estado', value: detailModal.data.estado },
        ] : []}
      />

      <FichaTecnicaFormModal
        open={showModal}
        ficha={selectedFicha}
        onSave={handleSave}
        isLoading={isSaving}
        onClose={() => {
          setShowModal(false);
          setSelectedFicha(null);
        }}
      />

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Eliminar Ficha Técnica"
        message={`¿Estás seguro de que deseas eliminar la ficha técnica "${deleteDialog.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null, nombre: '' })}
        isLoading={isDeleting}
      />

      {/* Modal de confirmación para Cambio de Estado */}
      <ConfirmDialog
        isOpen={statusDialog.isOpen}
        title={`Cambiar Estado a ${statusDialog.nextEstado}`}
        message={`¿Estás seguro de que deseas cambiar el estado de la receta "${statusDialog.ficha?.nombre}" de ${statusDialog.ficha?.estado || 'Vigente'} a ${statusDialog.nextEstado}?`}
        confirmText={`Cambiar a ${statusDialog.nextEstado}`}
        confirmVariant={statusDialog.nextEstado === 'Activo' ? 'success' : 'warning'}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setStatusDialog({ isOpen: false, ficha: null, nextEstado: 'Activo' })}
        isLoading={isUpdatingStatus}
        loadingText="Cambiando estado…"
      />
    </div>
  );
}
