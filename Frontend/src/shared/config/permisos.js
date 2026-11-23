/**
 * Matriz Oficial de Permisos por Rol (CENAREPAS)
 * Fuente: Story Mapping oficial del proyecto (aprobado por la instructora)
 *
 * ROLES DEL SISTEMA:
 * 1. Administrador (id_rol: 1) -> Acceso total a todos los módulos y acciones del sistema.
 * 2. Secretaria (id_rol: 2)    -> Acceso a 10 módulos operativos + Dashboard (sin Roles, Usuarios, Fichas Técnicas, Configuración).
 * 3. Vendedor (id_rol: 3)      -> Acceso a 5 módulos comerciales (Categorías y Productos en Solo Lectura, Clientes sin eliminar, Pedidos y Ventas completos).
 */

export const ROLES = {
  ADMIN: 1,
  ADMINISTRADOR: 1,
  SECRETARIA: 2,
  VENDEDOR: 3,
  DOMICILIARIO: 4,
};

export const ROLE_NAMES = {
  1: 'Administrador',
  2: 'Secretaria',
  3: 'Vendedor',
  4: 'Domiciliario',
};

export const ROLE_DEFAULT_USERS = {
  1: {
    id: 1,
    id_usuario: 1,
    nombre: 'Carlos Eduardo Gómez',
    correo: 'admin@sistema.com',
    rol: 'Administrador',
    cargo: 'Administrador General',
    telefono: '+57 318 456 1230',
    fechaCreacion: '15 Enero 2024',
    ultimoAcceso: 'Hoy - 10:30 AM',
    iniciales: 'CG',
  },
  2: {
    id: 2,
    id_usuario: 2,
    nombre: 'Laura Gómez',
    correo: 'secretaria@cenarepas.com',
    rol: 'Secretaria',
    cargo: 'Secretaria / Gestión Operativa',
    telefono: '+57 312 890 1234',
    fechaCreacion: '20 Febrero 2024',
    ultimoAcceso: 'Hoy - 09:15 AM',
    iniciales: 'LG',
  },
  3: {
    id: 3,
    id_usuario: 3,
    nombre: 'Carlos Ruiz',
    correo: 'vendedor@cenarepas.com',
    rol: 'Vendedor',
    cargo: 'Asesor Comercial / Vendedor',
    telefono: '+57 300 123 4567',
    fechaCreacion: '10 Marzo 2024',
    ultimoAcceso: 'Hoy - 08:45 AM',
    iniciales: 'CR',
  },
};

// Matriz de permisos detallada por módulo y acción para cada rol
export const MATRIZ_PERMISOS = {
  // ── 1. ROL: ADMINISTRADOR ──
  1: {
    dashboard: ['ver', 'exportar'],
    roles: ['ver', 'crear', 'editar', 'eliminar'],
    usuarios: ['ver', 'crear', 'editar', 'eliminar'],
    proveedores: ['ver', 'crear', 'editar', 'eliminar'],
    compras: ['ver', 'crear', 'editar', 'eliminar', 'anular'],
    categorias: ['ver', 'crear', 'editar', 'eliminar', 'cambiar_estado'],
    'fichas-tecnicas': ['ver', 'crear', 'editar', 'eliminar'],
    insumos: ['ver', 'crear', 'editar', 'eliminar'],
    produccion: ['ver', 'crear', 'editar', 'eliminar', 'anular'],
    productos: ['ver', 'crear', 'editar', 'eliminar', 'imagen', 'vencimiento'],
    clientes: ['ver', 'crear', 'editar', 'eliminar', 'cambiar_estado'],
    pedidos: ['ver', 'crear', 'editar', 'eliminar', 'anular', 'cambiar_estado', 'abonos'],
    ventas: ['ver', 'crear', 'editar', 'eliminar', 'anular', 'cambiar_estado', 'exportar'],
    configuracion: ['ver', 'crear', 'editar', 'eliminar'],
    profile: ['ver', 'editar'],
  },

  // ── 2. ROL: SECRETARIA ──
  // Módulos visibles en sidebar: Proveedores, Compras, Categoría Producto, Insumos, Producción, Producto, Clientes, Pedidos, Ventas, Dashboard.
  // Módulos NO visibles: Roles, Usuarios, Ficha Técnica, Configuración.
  2: {
    dashboard: ['ver', 'exportar'],
    proveedores: ['ver', 'crear', 'editar', 'eliminar'],
    compras: ['ver', 'crear', 'editar', 'anular'], // Anular compra en vez de eliminar
    categorias: ['ver', 'crear', 'editar', 'eliminar', 'cambiar_estado'],
    insumos: ['ver', 'crear', 'editar', 'eliminar'],
    produccion: ['ver', 'crear', 'editar', 'eliminar', 'anular'],
    productos: ['ver', 'crear', 'editar', 'eliminar', 'imagen', 'vencimiento'], // Con imagen y fecha de vencimiento
    clientes: ['ver', 'crear', 'editar', 'eliminar', 'cambiar_estado'], // Con eliminar y cambiar estado
    pedidos: ['ver', 'crear', 'editar', 'eliminar', 'anular', 'cambiar_estado', 'abonos'],
    ventas: ['ver', 'crear', 'editar', 'eliminar', 'anular', 'cambiar_estado', 'exportar'],
    profile: ['ver', 'editar'],
  },

  // ── 3. ROL: VENDEDOR ──
  // Módulos visibles en sidebar: Categoría Producto (solo lectura), Producto (solo lectura), Clientes, Pedidos, Ventas.
  // Módulos NO visibles: Roles, Usuarios, Proveedores, Compras, Ficha Técnica, Insumos, Producción, Dashboard, Configuración.
  3: {
    categorias: ['ver'], // Solo lectura: Listar, Buscar, Ver detalle, Paginar, Filtrar
    productos: ['ver'],  // Solo lectura: Listar, Buscar, Ver detalle, Paginar, Filtrar
    clientes: ['ver', 'crear', 'editar'], // Acceso completo sin eliminar
    pedidos: ['ver', 'crear', 'editar', 'anular', 'cambiar_estado', 'abonos'], // Acceso completo
    ventas: ['ver', 'crear', 'editar', 'anular', 'cambiar_estado', 'exportar'], // Acceso completo
    profile: ['ver', 'editar'],
  },
};

// Clave de MATRIZ_PERMISOS por nombre de rol (en minúsculas). Los ids de la
// base cambian entre bases (en Staging Cliente es 26): por eso se usa el nombre.
const MATRIZ_POR_NOMBRE = Object.fromEntries(
  Object.entries(ROLE_NAMES).map(([id, nombre]) => [nombre.toLowerCase(), Number(id)])
);

/**
 * Ruta de inicio según el NOMBRE del rol (usuario.rol que devuelve el backend).
 * Cliente → '/cliente'. Personal: '/admin' si ve el Dashboard; si no, su primer
 * módulo accesible. Un rol desconocido va a su perfil (sin permisos de más).
 */
export function getDefaultRouteForRole(rolNombre) {
  const nombre = String(rolNombre || '').toLowerCase().trim();
  if (nombre === 'cliente') {
    return '/cliente';
  }

  const perms = MATRIZ_PERMISOS[MATRIZ_POR_NOMBRE[nombre]];
  if (!perms) {
    return '/admin/profile';
  }

  if (perms.dashboard && perms.dashboard.includes('ver')) {
    return '/admin';
  }
  if (perms.pedidos && perms.pedidos.includes('ver')) {
    return '/admin/pedidos';
  }
  if (perms.ventas && perms.ventas.includes('ver')) {
    return '/admin/ventas';
  }
  if (perms.productos && perms.productos.includes('ver')) {
    return '/admin/productos';
  }
  if (perms.clientes && perms.clientes.includes('ver')) {
    return '/admin/clientes';
  }
  if (perms.categorias && perms.categorias.includes('ver')) {
    return '/admin/categorias';
  }
  return '/admin/profile';
}
