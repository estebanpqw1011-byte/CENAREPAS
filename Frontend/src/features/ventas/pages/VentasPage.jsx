import { useState, useMemo, useEffect } from 'react';
import { DollarSign, BarChart3, TrendingUp, ShoppingBag } from 'lucide-react';
import { useVentas } from '../hooks/useVentas';
import { getClientes } from '../../clientes/services/clientesService';
import { getUsuarios } from '../../usuarios/services/usuariosService';
import { DataTable } from '../../../shared/components/DataTable';
import { RowActions } from '../../../shared/components/RowActions';
import DetailModal from '../../../shared/components/DetailModal';
import PageHeader from '../../../shared/components/PageHeader';
import { MetricCard } from '../../../shared/components/MetricCard';
import EstadoBadge from '../../../shared/ui/EstadoBadge';
import { CustomSelect } from '../../../shared/components/CustomSelect';
import ErrorBanner from '../../../shared/components/ErrorBanner';
import { exportToPdf } from '../../../shared/utils/exportToPdf';
import { exportToExcel } from '../../../shared/utils/exportToExcel';

export default function VentasPage() {
  const {
    rawVentas,
    searchQuery,
    setSearchQuery,
    estadoFilter,
    setEstadoFilter,
    detailModal,
    setDetailModal,
    isLoading,
    loadError,
    refetch,
  } = useVentas();
  const [clientes, setClientes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    getClientes().then((data) => {
      if (Array.isArray(data)) setClientes(data);
    }).catch(() => {});
    getUsuarios().then((data) => {
      if (Array.isArray(data)) setUsuarios(data);
    }).catch(() => {});
  }, []);

  const clientesNames = useMemo(
    () => Object.fromEntries(clientes.map((c) => [c.id_cliente, c.nombre])),
    [clientes]
  );
  const usuariosNames = useMemo(
    () => Object.fromEntries(usuarios.map((u) => [u.id_usuario, u.nombre])),
    [usuarios]
  );


  const totalVentas = rawVentas.length;
  const ventasHoy = useMemo(
    () => rawVentas.reduce((acc, v) => acc + (Number(v.valor_total) || 0), 0),
    [rawVentas]
  );
  const promedioVentas = totalVentas > 0 ? ventasHoy / totalVentas : 0;

  const filteredData = useMemo(() => {
    return rawVentas.filter((v) => {
      const q = (searchQuery || '').toLowerCase().trim();
      const clienteNombre = (clientesNames[v.id_cliente] || '').toLowerCase();
      const usuarioNombre = (usuariosNames[v.id_usuario] || '').toLowerCase();
      const matchesSearch =
        !q ||
        String(v.id_venta).toLowerCase().includes(q) ||
        String(v.id_cliente).toLowerCase().includes(q) ||
        clienteNombre.includes(q) ||
        usuarioNombre.includes(q) ||
        String(v.id_sede).toLowerCase().includes(q) ||
        (v.medio_pago || '').toLowerCase().includes(q);
      const isTodosEstado = estadoFilter === 'Todos' || estadoFilter === 'Todos los estados';
      const matchesEstado = isTodosEstado || String(v.estado).toLowerCase() === String(estadoFilter).toLowerCase();
      return matchesSearch && matchesEstado;
    });
  }, [rawVentas, searchQuery, estadoFilter, clientesNames, usuariosNames]);

  const columns = useMemo(
    () => [
      {
        key: 'id_venta',
        label: 'ID',
        render: (value) => <span className="font-mono font-medium text-xs">#{value}</span>,
      },
      {
        key: 'id_cliente',
        label: 'Cliente',
        render: (value) => (
          <span className="font-semibold text-foreground">
            {clientesNames[value] || (typeof value === 'string' && isNaN(Number(value)) ? value : `Cliente #${value}`)}
          </span>
        ),
      },
      {
        key: 'id_sede',
        label: 'Sede',
        render: (value) => <span className="text-muted-foreground text-xs">{value === 1 ? 'Sede Principal (Ibagué)' : `Sede #${value}`}</span>,
      },
      {
        key: 'id_usuario',
        label: 'Vendedor',
        render: (value) => <span className="text-muted-foreground text-xs">{usuariosNames[value] || `Usuario #${value}`}</span>,
      },
      {
        key: 'fecha_venta',
        label: 'Fecha Venta',
        render: (value) => (
          <span className="text-muted-foreground text-xs">
            {value ? new Date(value).toLocaleDateString('es-CO') : 'N/A'}
          </span>
        ),
      },
      {
        key: 'valor_total',
        label: 'Valor Total',
        render: (value, v) => (
          <span className="font-semibold text-primary">
            ${Number(v.totalNum || value || 0).toLocaleString('es-CO')}
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
              pendiente: { label: 'Pendiente', color: 'warning' },
              pagada: { label: 'Pagada', color: 'success' },
              anulada: { label: 'Anulada', color: 'destructive' },
            }}
          />
        ),
      },
      {
        key: 'acciones',
        label: 'Acciones',
        render: (_, venta) => (
          // Solo lectura: una venta es un pedido Entregado (se anula desde Pedidos).
          <RowActions onView={() => setDetailModal({ isOpen: true, data: venta })} />
        ),
      },
    ],
    [clientesNames, usuariosNames, setDetailModal]
  );

  const handleExportPdf = () => {
    exportToPdf({
      data: filteredData,
      columns: [
        { header: 'ID', key: 'id_venta' },
        {
          header: 'Cliente',
          accessor: (v) => v.cliente_nombre || clientesNames[v.id_cliente] || `Cliente #${v.id_cliente}`,
        },
        {
          header: 'Fecha Venta',
          accessor: (v) => (v.fecha_venta ? new Date(v.fecha_venta).toLocaleDateString('es-CO') : 'N/A'),
        },
        { header: 'Medio de Pago', key: 'medio_pago' },
        {
          header: 'Valor Total',
          accessor: (v) => `$${Number(v.totalNum || v.valor_total || 0).toLocaleString('es-CO')}`,
        },
        { header: 'Estado', key: 'estado' },
      ],
      title: 'Reporte de Ventas',
      subtitle: 'Facturación en mostrador y pedidos liquidados en CENAREPAS',
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      data: filteredData,
      columns: [
        { header: 'ID Venta', key: 'id_venta', align: 'center' },
        {
          header: 'Cliente',
          accessor: (v) => v.cliente_nombre || clientesNames[v.id_cliente] || `Cliente #${v.id_cliente}`,
        },
        {
          header: 'Fecha y Hora Venta',
          accessor: (v) => (v.fecha_venta ? new Date(v.fecha_venta).toLocaleString('es-CO') : 'N/A'),
          align: 'center',
        },
        { header: 'Medio de Pago', key: 'medio_pago' },
        {
          header: 'Valor Total ($)',
          accessor: (v) => `$${Number(v.totalNum || v.valor_total || 0).toLocaleString('es-CO')}`,
          align: 'right',
        },
        { header: 'Estado', key: 'estado', align: 'center' },
        { header: 'Comprobante URL', key: 'comprobante_url' },
      ],
      title: 'Reporte de Ventas',
      subtitle: 'Facturación en mostrador y pedidos liquidados en CENAREPAS',
      sheetName: 'Ventas',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventas"
        subtitle="Pedidos entregados (solo lectura). Para registrar una venta, entrega el pedido desde Pedidos."
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-stretch">
        <MetricCard index={0} title="Ventas Totales ($)" value={`$${ventasHoy.toLocaleString('es-CO')}`} icon={DollarSign} variant="success" />
        <MetricCard index={1} title="Total Registros" value={`${totalVentas} ventas`} icon={BarChart3} variant="primary" />
        <MetricCard index={2} title="Promedio Ticket" value={`$${Math.round(promedioVentas).toLocaleString('es-CO')}`} icon={TrendingUp} variant="accent" />
        <MetricCard index={3} title="Pagadas" value={rawVentas.filter((v) => String(v.estado).toLowerCase() === 'pagada').length} icon={ShoppingBag} variant="warning" />
      </div>

      <ErrorBanner message={loadError} onRetry={refetch} />

      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading}
        emptyIcon={DollarSign}
        entityName="ventas"
        isFiltered={Boolean(searchQuery || estadoFilter !== 'Todos')}
        searchPlaceholder="Buscar por ID, cliente, sede o medio de pago..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={
          <CustomSelect
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="w-full sm:w-48"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Pagada">Pagada</option>
            <option value="Anulada">Anulada</option>
          </CustomSelect>
        }
      />
      <DetailModal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, data: null })}
        title="Detalle de la Venta"
        fields={detailModal.data ? [
          { label: 'ID Venta', value: `#${detailModal.data.id_venta}` },
          { label: 'Sede / Punto', value: detailModal.data.id_sede === 1 ? 'Sede Principal (Ibagué)' : `Sede #${detailModal.data.id_sede}` },
          { label: 'Cliente', value: clientesNames[detailModal.data.id_cliente] || `Cliente #${detailModal.data.id_cliente}` },
          { label: 'Vendedor / Usuario', value: usuariosNames[detailModal.data.id_usuario] || `Usuario #${detailModal.data.id_usuario}` },
          { label: 'Pedido Origen', value: detailModal.data.id_pedido ? `#${detailModal.data.id_pedido}` : 'Venta directa en mostrador' },
          { label: 'Fecha Venta', value: detailModal.data.fecha_venta },
          { label: 'Medio de Pago', value: <span className="capitalize">{detailModal.data.medio_pago}</span> },
          { label: 'Valor Total', value: <span className="font-semibold text-primary">{`$${Number(detailModal.data.valor_total || 0).toLocaleString('es-CO')}`}</span> },
          {
            label: 'Productos Vendidos',
            value: (
              <div className="space-y-1 mt-1 text-left w-full">
                {(detailModal.data.detalles || []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-border/40 last:border-0">
                    <span className="font-medium text-foreground">{item.producto_nombre || `Producto #${item.id_producto}`}</span>
                    <span className="text-muted-foreground">{item.cantidad} und x ${Number(item.precio_unitario).toLocaleString('es-CO')} = <strong className="text-primary">${Number(item.subtotal).toLocaleString('es-CO')}</strong></span>
                  </div>
                ))}
              </div>
            ),
          },
          {
            label: 'Comprobante de Pago',
            value: detailModal.data.comprobante_url ? (
              <a
                href={detailModal.data.comprobante_url}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline font-medium text-xs inline-flex items-center gap-1"
              >
                Ver comprobante adjunto
              </a>
            ) : (
              'Sin comprobante adjunto'
            ),
          },
          { label: 'Estado', value: detailModal.data.estado },
        ] : []}
      />
    </div>
  );
}