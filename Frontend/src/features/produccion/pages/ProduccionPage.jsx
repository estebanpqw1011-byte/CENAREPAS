import { useState, useMemo, useEffect } from 'react';
import { Factory, CheckCircle, Clock, Calendar } from 'lucide-react';
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
import StatusSwitch from '../../../shared/components/StatusSwitch';
import { CustomSelect } from '../../../shared/components/CustomSelect';
import { formatDate } from '../../../shared/utils/formatDate';

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
    hasLoadError,
    handleSave,
    handleAnular,
  } = useProduccion();

  const [selectedLote, setSelectedLote] = useState(null);
  const [fichas, setFichas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [insumosList, setInsumosList] = useState([]);

  const getLoteInsumosList = (lote) => {
    if (!lote) return [];
    const insumos = Array.isArray(lote.insumos) ? lote.insumos : lote.insumos_consumidos;
    if (!Array.isArray(insumos)) return [];
    return insumos.map((item) => ({
      ...item,
      nombre: item.insumo_nombre || item.nombre || '—',
      cantidad: item.cantidad ?? item.cantidad_consumida,
      unidad_medida: item.unidad_medida ||
        insumosList.find((insumo) => String(insumo.id_insumo) === String(item.id_insumo))?.unidad_medida ||
        '—',
    }));
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
  const finalizados = rawLotes.filter((l) => String(l.estado).toLowerCase() === 'finalizado').length;
  const enProceso = rawLotes.filter((l) => String(l.estado).toLowerCase() === 'en proceso' || String(l.estado).toLowerCase() === 'en_proceso').length;
  const programados = rawLotes.filter((l) => String(l.estado).toLowerCase() === 'programado').length;

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
        key: 'id_usuario_responsable',
        label: 'Responsable',
        render: (value) => (
          <span className="text-muted-foreground text-sm">
            {usuariosNames[value] || `Usuario #${value}`}
          </span>
        ),
      },
      {
        key: 'cantidad_producida',
        label: 'Cantidad Producida',
        render: (value) => <span className="font-semibold text-sm">{Number(value || 0).toLocaleString('es-CO')} und</span>,
      },
      {
        key: 'fecha_produccion',
        label: 'Fecha',
        render: (value) => <span className="text-muted-foreground text-sm">{formatDate(value)}</span>,
      },
      {
        key: 'estado',
        label: 'Estado',
        render: (value) => <StatusSwitch value={value} />,
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
              editDisabled={!can('produccion', 'editar') || isAnulado}
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
      />

      {/* Tarjetas de Consolidado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard index={0} title="Total Lotes" value={isLoading || hasLoadError ? '—' : totalLotes} icon={Factory} variant="primary" />
        <MetricCard index={1} title="Finalizados" value={isLoading || hasLoadError ? '—' : finalizados} icon={CheckCircle} variant="success" />
        <MetricCard index={2} title="En Proceso" value={isLoading || hasLoadError ? '—' : enProceso} icon={Clock} variant="warning" />
        <MetricCard index={3} title="Programados" value={isLoading || hasLoadError ? '—' : programados} icon={Calendar} variant="accent" />
      </div>

      {/* Tabla con DataTable y RowActions */}
      <DataTable
        columns={columns}
        data={filteredData}
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
            <option value="Finalizado">Finalizado</option>
            <option value="En Proceso">En Proceso</option>
            <option value="Programado">Programado</option>
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
          { label: 'Responsable', value: usuariosNames[detailModal.data.id_usuario_responsable] || `Usuario #${detailModal.data.id_usuario_responsable}` },
          { label: 'Fecha de Producción', value: formatDate(detailModal.data.fecha_produccion) },
          {
            label: 'Cantidad Producida',
            value: detailModal.data.cantidad_producida == null || detailModal.data.cantidad_producida === ''
              ? '—'
              : `${Number(detailModal.data.cantidad_producida).toLocaleString('es-CO')} und`,
          },
          {
            label: 'Insumos Utilizados',
            value: (() => {
              const list = getLoteInsumosList(detailModal.data);
              if (!list || list.length === 0) return 'Sin registro de insumos';
              return (
                <div className="space-y-1 w-full text-left">
                  {list.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 text-xs bg-card p-1.5 rounded border border-border/50">
                      <span className="font-medium text-foreground">{item.nombre}</span>
                      <span className="font-semibold text-primary px-2 py-0.5 bg-primary/10 rounded">
                        {item.cantidad} {item.unidad_medida || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })(),
          },
          { label: 'Observaciones', value: detailModal.data.observaciones || 'N/A' },
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
        message={`¿Deseas anular el lote "${deleteDialog.nombre}"? Se conservará el registro y, si el inventario fue actualizado al crearlo, se revertirán esos movimientos.`}
        confirmText="Anular"
        onConfirm={handleAnular}
        onCancel={() => setDeleteDialog({ isOpen: false, id: null, nombre: '' })}
        isLoading={isDeleting}
      />
    </div>
  );
}
