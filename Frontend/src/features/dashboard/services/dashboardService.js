// dashboardService.js - Servicio de datos para el Panel de Datos de CENAREPAS
import { api } from '../../../shared/services/api.js';

export const fallbackDashboardData = {
  kpis: {
    ventasHoy: 2450000,
    ventasHoyCambio: 12.5,
    pedidosProcesados: 84,
    pedidosCambio: 8.0,
    insumosActivos: 37,
    insumosCambio: -3.0,
    produccionDia: 1240,
    produccionCambio: 5.0,
  },
  featuredInsumos: [
    {
      id: 'harina-amarilla',
      nombre: 'Harina Maíz Amarillo',
      rotacionDias: 4.2,
      deltaPct: -14.3,
      deltaAbs: '-0.7d',
      tendencia: [5.6, 5.4, 5.1, 4.9, 4.6, 4.4, 4.2],
    },
    {
      id: 'harina-blanca',
      nombre: 'Harina Maíz Blanco',
      rotacionDias: 7.8,
      deltaPct: 6.8,
      deltaAbs: '+0.5d',
      tendencia: [7.1, 7.2, 7.0, 7.4, 7.5, 7.6, 7.8],
    },
    {
      id: 'sal-refinada',
      nombre: 'Sal Refinada',
      rotacionDias: 21.5,
      deltaPct: 2.1,
      deltaAbs: '+0.4d',
      tendencia: [20.8, 21.0, 20.9, 21.1, 21.2, 21.3, 21.5],
    },
  ],
  pedidoActivo: {
    id: '#4821',
    cliente: 'Panadería La Espiga',
    sede: 'Bello Oriente',
    estado: 'retrasado',
    unidades: 3200,
  },
  produccionLineas: [
    { linea: 'Blanca', unidades: 620, destacada: false },
    { linea: 'Amarilla', unidades: 980, destacada: true },
    { linea: 'Integral', unidades: 410, destacada: false },
    { linea: 'Queso', unidades: 710, destacada: false },
  ],
  pedidosFlow: { belloOriente: 48, aranjuez: 36 },
  insumosRotacion: [
    { insumo: 'Harina de Maíz Amarillo', rotacionDias: 4.2, stock: '180 kg', estado: 'critico' },
    { insumo: 'Harina de Maíz Blanco', rotacionDias: 7.8, stock: '340 kg', estado: 'atencion' },
    { insumo: 'Sal Refinada', rotacionDias: 21.5, stock: '90 kg', estado: 'optimo' },
    { insumo: 'Empaques x100', rotacionDias: 12.1, stock: '2.400 un.', estado: 'optimo' },
  ],
  topClientes: [
    { id: 1, iniciales: 'PE', nombre: 'Panadería La Espiga', pedidos: 132, bg: '#C1502D', fg: '#FFFFFF' },
    { id: 2, iniciales: 'ET', nombre: 'Supermercado El Trigal', pedidos: 118, bg: '#E8B23D', fg: '#78350F' },
    { id: 3, iniciales: 'SA', nombre: 'Restaurante Sabor Antioqueño', pedidos: 96, bg: '#5A7A3A', fg: '#FFFFFF' },
    { id: 4, iniciales: 'DR', nombre: 'Tienda Doña Rosa', pedidos: 84, bg: '#E2895F', fg: '#402310' },
    { id: 5, iniciales: 'CC', nombre: 'Cafetería Central', pedidos: 71, bg: '#F5ECD8', fg: '#2E2B25' },
  ],
  alertas: [
    { id: 1, icono: 'package', titulo: 'Stock bajo de harina de maíz', detalle: 'Por debajo del mínimo en Bello Oriente', accion: 'Ver Insumos', path: '/admin/insumos', tono: 'terracota' },
    { id: 2, icono: 'clock', titulo: 'Pedido #4821 retrasado', detalle: 'Producción sin iniciar, vence hoy', accion: 'Ver Pedido', path: '/admin/pedidos', tono: 'maiz' },
    { id: 3, icono: 'trending-down', titulo: 'Caída en ventas — Aranjuez', detalle: '-9% frente a la semana anterior', accion: 'Ver Ventas', path: '/admin/ventas', tono: 'beige' },
    { id: 4, icono: 'user-x', titulo: 'Usuario sin rol asignado', detalle: 'jvargas@cenarepas.com', accion: 'Asignar Rol', path: '/admin/usuarios', tono: 'verde' },
  ],
};

function normalizeDashboardData(res) {
  if (!res || typeof res !== 'object') {
    return fallbackDashboardData;
  }

  // Normalizar estructura de KPIs si viene del backend
  const kpis = {
    ventasHoy: res.kpis?.ventasHoy ?? res.kpis?.ventasDelDia?.valor ?? fallbackDashboardData.kpis.ventasHoy,
    ventasHoyCambio: res.kpis?.ventasHoyCambio ?? 12.5,
    pedidosProcesados: res.kpis?.pedidosProcesados ?? res.kpis?.pedidosHoy?.valor ?? fallbackDashboardData.kpis.pedidosProcesados,
    pedidosCambio: res.kpis?.pedidosCambio ?? 8.0,
    insumosActivos: res.kpis?.insumosActivos ?? res.kpis?.stockBajo?.valor ?? fallbackDashboardData.kpis.insumosActivos,
    insumosCambio: res.kpis?.insumosCambio ?? -3.0,
    produccionDia: res.kpis?.produccionDia ?? fallbackDashboardData.kpis.produccionDia,
    produccionCambio: res.kpis?.produccionCambio ?? 5.0,
  };

  return {
    ...fallbackDashboardData,
    ...res,
    kpis,
    featuredInsumos: res.featuredInsumos || fallbackDashboardData.featuredInsumos,
    pedidoActivo: res.pedidoActivo || fallbackDashboardData.pedidoActivo,
    produccionLineas: res.produccionLineas || fallbackDashboardData.produccionLineas,
    pedidosFlow: res.pedidosFlow || fallbackDashboardData.pedidosFlow,
    insumosRotacion: res.insumosRotacion || fallbackDashboardData.insumosRotacion,
    topClientes: res.topClientes || fallbackDashboardData.topClientes,
    alertas: res.alertas || fallbackDashboardData.alertas,
  };
}

export const getDashboardData = async () => {
  try {
    const res = await api.get('/dashboard', () => fallbackDashboardData);
    return normalizeDashboardData(res);
  } catch (error) {
    console.warn('[dashboardService] Error al obtener datos, usando fallback:', error);
    return fallbackDashboardData;
  }
};
