import { useState, useMemo, useEffect } from 'react';
import { Factory, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useProduccion } from '../hooks/useProduccion';
import { getInsumos } from '../../insumos/services/insumosService';
import { getFichasTecnicas } from '../../fichas-tecnicas/services/fichasTecnicasService';
import { getUsuarios } from '../../usuarios/services/usuariosService';
import { DataTable } from '../../../shared/components/DataTable';
import { RowActions } from '../../../shared/components/RowActions';
import { ProduccionFormModal } from '../components/ProduccionFormModal';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import DetailModal from '../../../shared/components/DetailModal';
import PageHeader from '../../../shared/components/PageHeader';
import { MetricCard } from '../../../shared/components/MetricCard';
import { usePermissions } from '../../../shared/contexts/PermissionContext';
import EstadoBadge from '../../../shared/ui/EstadoBadge';
import { CustomSelect } from '../../../shared/components/CustomSelect';
import ErrorBanner from '../../../shared/components/ErrorBanner';
import { exportToPdf } from '../../../shared/utils/exportToPdf';
import { exportToExcel } from '../../../shared/utils/exportToExcel';

export default function ProduccionPage() {
  const { can } = usePermissions();
  const {
    rawLotes,
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
    isDeleting,
    isSaving,
    isLoading,
    loadError,
    refetch,
    handleSave,
    handleAnular,
  } = useProduccion();

  const [selectedLote, setSelectedLote] = useState(null);
  const [fichas, setFichas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [insumosList, setInsumosList] = useState([]);

  const getLoteInsumosList = (lote) => {
    if (!lote) return [];
    if (Array.isArray(lote.insumos_consumidos) && lote.insumos_consumidos.length > 0) {
      return lote.insumos_consumidos;
    }
    return [];
  };

  useEffect(() => {
    getFichasTecnicas().then((data) => {
      if (Array.isArray(data)) setFichas(data);
    }).catch(() => {});
    getUsuarios().then((data) => {
      if (Array.isArray(data)) setUsuarios(data);
    }).catch(() => {});
    getInsumos().then((data) => {
      if (Array.isArray(data)) setInsumosList(data);
    }).catch(() => {});
  }, []);

  const fichasNames = useMemo(
    () => Object.fromEntries(fichas.map((f) => [f.id_ficha, f.nombre])),
    [fichas]
  );

  const usuariosNames = useMemo(
    () => Object.fromEntries(usuarios.map((u) => [u.id_usuario, u.nombre])),
    [usuarios]
  );


  const totalLotes = rawLotes.length;
  const finalizados = rawLotes.filter((l) => String(l.estado).toLowerCase() === 'terminado').length;
  const enProceso = rawLotes.filter((l) => String(l.estado).toLowerCase() === 'en proceso').length;
  const anulados = rawLotes.filter((l) => String(l.estado).toLowerCase() === 'anulado').length;

  const filteredData = useMemo(() => {
    return rawLotes.filter((l) => {
      const q = searchQuery.toLowerCase().trim();
      const fichaNombre = (fichasNames[l.id_ficha] || '').toLowerCase();
      const usuarioNombre = (usuariosNames[l.id_usuario_responsable] || '').toLowerCase();
      const matchesSearch =
        !q ||
        String(l.id_lote).toLowerCase().includes(q) ||
        String(l.id_ficha).toLowerCase().includes(q) ||
        String(l.id_usuario_responsable).toLowerCase().includes(q) ||
        fichaNombre.includes(q) ||
        usuarioNombre.includes(q) ||
        (l.observaciones || '').toLowerCase().includes(q);

      const isTodosEstado = estadoFilter === 'Todos' || estadoFilter === 'Todos los estados';
      const matchesEstado =
        isTodosEstado || String(l.estado).toLowerCase() === estadoFilter.toLowerCase();

      return matchesSearch && matchesEstado;
    });
  }, [rawLotes, searchQuery, estadoFilter, fichasNames, usuariosNames]);

  const columns = useMemo(
    () => [
      {
        key: 'id_lote',
        label: 'Código Lote',
        render: (value) => <span className="font-mono font-medium text-xs">#{value}</span>,
      },
      {
        key: 'id_ficha',
        label: 'Ficha Técnica / Receta',
        render: (value) => (
          <span className="font-semibold text-foreground">
            {fichasNames[value] || `Receta #${value}`}
          </span>
        ),
      },
      {
        key: 'fecha_produccion',
        label: 'Fecha',
        render: (value) => <span className="text-muted-foreground text-sm">{value}</span>,
      },
      {
        key: 'cantidad_producida',
        label: 'Cantidad Producida',
        render: (value) => <span className="font-semibold text-sm">{Number(value || 0).toLocaleString('es-CO')} und</span>,
      },
      {
        key: 'id_usuario_responsable',
        label: 'Responsable',
        render: (value) => (
          <span className="text-muted-foreground text-sm">
            {usuariosNames[value] || `Usuario #${value}`}
          </span>
        ),
      },
      {
        key: 'estado',
        label: 'Estado',
        render: (value) => (
          <EstadoBadge
            value={value}
            statusMap={{
              'en proceso': { label: 'En proceso', color: 'warning' },
              terminado: { label: 'Terminado', color: 'success' },
              anulado: { label: 'Anulado', color: 'destructive' },
            }}
          />
        ),
      },
      {
        key: 'acciones',
        label: 'Acciones',
        render: (_, lote) => {
          const isAnulado = String(lote.estado).toLowerCase() === 'anulado';
          return (
            <RowActions
              onView={() => setDetailModal({ isOpen: true, data: lote })}
              onEdit={() => {
                setSelectedLote(lote);
                setShowModal(true);
              }}
              editDisabled={!can('produccion', 'editar')}
              onDelete={
                !isAnulado
                  ? () =>
                      setDeleteDialog({
                        isOpen: true,
                        id: lote.id_lote,
                        nombre: `Lote #${lote.id_lote}`,
                      })
                  : undefined
              }
              deleteDisabled={!can('produccion', 'eliminar') || isAnulado}
              deleteTitle="Anular Lote"
            />
          );
        },
      },
    ],
    [can, fichasNames, usuariosNames, setDetailModal, setShowModal, setDeleteDialog]
  );

  const handleExportPdf = () => {
    exportToPdf({
      data: filteredData,
      columns: [
        { header: 'ID Lote', key: 'id_lote' },
        {
          header: 'Ficha / Receta',
          accessor: (l) => fichasNames[l.id_ficha] || `Ficha #${l.id_ficha}`,
        },
        {
          header: 'Cantidad Producida',
          accessor: (l) => `${l.cantidad_producida || 0} pqtes`,
        },
        { header: 'Fecha Producción', key: 'fecha_produccion' },
        {
          header: 'Responsable',
          accessor: (l) => usuariosNames[l.id_usuario_responsable] || `Usuario #${l.id_usuario_responsable}`,
        },
        { header: 'Estado', key: 'estado' },
      ],
      title: 'Reporte de Lotes de Producción',
      subtitle: 'Control de lotes elaborados, fechas y operarios responsables en CENAREPAS',
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      data: filteredData,
      columns: [
        { header: 'ID Lote', key: 'id_lote', align: 'center' },
        {
          header: 'Ficha Técnica / Receta',
          accessor: (l) => fichasNames[l.id_ficha] || `Ficha #${l.id_ficha}`,
        },
        {
          header: 'Cantidad Producida (pqtes)',
          accessor: (l) => l.cantidad_producida || 0,
          align: 'right',
        },
        { header: 'Fecha de Producción', key: 'fecha_produccion', align: 'center' },
        {
          header: 'Responsable de Turno',
          accessor: (l) => usuariosNames[l.id_usuario_responsable] || `Usuario #${l.id_usuario_responsable}`,
        },
        { header: 'Observaciones', key: 'observaciones' },
        { header: 'Estado', key: 'estado', align: 'center' },
      ],
      title: 'Reporte de Lotes de Producción',
      subtitle: 'Control de lotes elaborados, fechas y operarios responsables en CENAREPAS',
      sheetName: 'Produccion',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Producción de Arepas"
        subtitle="Control de lotes, molienda y empaque en planta Masarepas"
        addLabel="Registrar Lote"
        addDisabled={!can('produccion', 'crear')}
        onAdd={() => {
          setSelectedLote(null);
          setShowModal(true);
        }}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
      />

      {/* Tarjetas de Consolidado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
        <MetricCard index={0} title="Total Lotes" value={totalLotes} icon={Factory} variant="primary" />
        <MetricCard index={1} title="Finalizados" value={finalizados} icon={CheckCircle} variant="success" />
        <MetricCard index={2} title="En Proceso" value={enProceso} icon={Clock} variant="warning" />
        <MetricCard index={3} title="Anulados" value={anulados} icon={XCircle} variant="destructive" />
      </div>

      <ErrorBanner message={loadError} onRetry={refetch} />

      {/* Tabla con DataTable y RowActions */}
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        emptyIcon={Factory}
        entityName="órdenes de producción"
        onAdd={() => {
          setSelectedLote(null);
          setShowModal(true);
        }}
        addLabel="Nueva Orden"
        addDisabled={!can('produccion', 'crear')}
        isFiltered={Boolean(searchQuery || estadoFilter !== 'Todos')}
        searchPlaceholder="Buscar por código de lote, receta o responsable..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={
          <CustomSelect
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="w-full sm:w-52"
          >
            <option value="Todos">Todos los estados</option>
            <option value="En proceso">En Proceso</option>
            <option value="Terminado">Terminado</option>
            <option value="Anulado">Anulado</option>
          </CustomSelect>
        }
      />

      <DetailModal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, data: null })}
        title="Detalle del Lote de Producción"
        fields={detailModal.data ? [
          { label: 'ID', value: `#${detailModal.data.id_lote}` },
          { label: 'Ficha / Receta', value: fichasNames[detailModal.data.id_ficha] || `Receta #${detailModal.data.id_ficha}` },
          { label: 'Fecha de Producción', value: detailModal.data.fecha_produccion },
          { label: 'Cantidad Producida', value: `${Number(detailModal.data.cantidad_producida || 0).toLocaleString('es-CO')} und` },
          { label: 'Responsable', value: usuariosNames[detailModal.data.id_usuario_responsable] || `Usuario #${detailModal.data.id_usuario_responsable}` },
          { label: 'Observaciones', value: detailModal.data.observaciones || 'N/A' },
          {
            label: 'Insumos Utilizados',
            value: (() => {
              const list = getLoteInsumosList(detailModal.data);
              if (!list || list.length === 0) return 'Sin registro de insumos';
              return (
                <div className="space-y-1 w-full text-left">
                  {list.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 text-xs bg-card p-1.5 rounded border border-border/50">
                      <span className="font-medium text-foreground">{item.insumo_nombre}</span>
                      <span className="font-semibold text-primary px-2 py-0.5 bg-primary/10 rounded">
                        {item.cantidad_consumida} {item.unidad_medida || 'kg'}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })(),
          },
          { label: 'Estado', value: detailModal.data.estado },
        ] : []}
      />

      <ProduccionFormModal
        open={showModal}
        lote={selectedLote}
        onSave={handleSave}
        isLoading={isSaving}
        onClose={() => {
          setShowModal(false);
          setSelectedLote(null);
        }}
      />

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Anular Lote de Producción"
        message={`¿Estás seguro de que deseas anular el lote "${deleteDialog.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Anular"
        onConfirm={handleAnular}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null, nombre: '' })}
        isLoading={isDeleting}
      />
    </div>
  );
}
