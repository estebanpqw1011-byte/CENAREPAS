import { createContext, useContext, useMemo, useState } from 'react';
import {
  ROLES,
  ROLE_NAMES,
  ROLE_DEFAULT_USERS,
  MATRIZ_PERMISOS,
  getDefaultRouteForRole,
} from '../config/permisos';

export const mockPermisos = [
  { id_permiso: 1, modulo: 'dashboard', accion: 'ver', estado: 'activo' },
  { id_permiso: 2, modulo: 'roles', accion: 'ver', estado: 'activo' },
  { id_permiso: 3, modulo: 'roles', accion: 'crear', estado: 'activo' },
  { id_permiso: 4, modulo: 'roles', accion: 'editar', estado: 'activo' },
  { id_permiso: 5, modulo: 'roles', accion: 'eliminar', estado: 'activo' },
  { id_permiso: 6, modulo: 'usuarios', accion: 'ver', estado: 'activo' },
  { id_permiso: 7, modulo: 'usuarios', accion: 'crear', estado: 'activo' },
  { id_permiso: 8, modulo: 'usuarios', accion: 'editar', estado: 'activo' },
  { id_permiso: 9, modulo: 'usuarios', accion: 'eliminar', estado: 'activo' },
  ...['proveedores', 'clientes', 'compras', 'categorias', 'fichas-tecnicas', 'insumos', 'produccion', 'productos', 'pedidos', 'ventas', 'configuracion'].flatMap((modulo, offset) =>
    ['ver', 'crear', 'editar', 'eliminar'].map((accion, index) => ({
      id_permiso: 10 + offset * 4 + index,
      modulo,
      accion,
      estado: 'activo',
    }))
  ),
];

export const defaultRolePermissions = {
  // 1: Administrador (Total)
  1: mockPermisos.map((p) => p.id_permiso),
  // 2: Secretaria (Proveedores, Compras, Categorías, Insumos, Producción, Productos, Clientes, Pedidos, Ventas, Dashboard)
  2: [
    1, // Dashboard
    10, 11, 12, 13, // Proveedores
    14, 15, 16, 17, // Clientes
    18, 19, 20, 21, // Compras
    22, 23, 24, 25, // Categorías
    30, 31, 32, 33, // Insumos
    34, 35, 36, 37, // Producción
    38, 39, 40, 41, // Productos
    42, 43, 44, 45, // Pedidos
    46, 47, 48, 49, // Ventas
  ],
  // 3: Vendedor (Categorías [solo lectura], Productos [solo lectura], Clientes [sin eliminar], Pedidos, Ventas)
  3: [
    22, // Categorías ver
    38, // Productos ver
    14, 15, 16, // Clientes (ver, crear, editar)
    42, 43, 44, 45, // Pedidos (ver, crear, editar, anular/eliminar)
    46, 47, 48, 49, // Ventas (ver, crear, editar, anular/eliminar)
  ],
};

export const mockRolPermisos = [
  ...mockPermisos.map((permission) => ({ id_rol: 1, id_permiso: permission.id_permiso })),
];

const PermissionContext = createContext(null);

const leerUsuarioGuardado = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}') || {};
  } catch {
    return {};
  }
};

const inicialesDe = (nombre) =>
  String(nombre).trim().split(/\s+/).filter((p) => /\p{L}/u.test(p[0])).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

export function PermissionProvider({ children }) {
  const getInitialRoleId = () => {
    try {
      const stored = localStorage.getItem('cenarepas_role_id');
      if (stored) {
        const num = Number(stored);
        if (!isNaN(num) && num > 0) return num;
      }
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user && user.id_rol) {
        const numUser = Number(user.id_rol);
        if (!isNaN(numUser) && numUser > 0) return numUser;
      }
    } catch {
      // ignore
    }
    return ROLES.ADMINISTRADOR || 1;
  };

  const [roleId, setRoleId] = useState(getInitialRoleId);
  // Usuario real de la sesión (el que guarda useAuth tras el login).
  const [usuarioSesion, setUsuarioSesion] = useState(leerUsuarioGuardado);
  const [rolePermissions, setRolePermissions] = useState(() => {
    try {
      const stored = localStorage.getItem('cenarepas_role_permissions');
      return stored ? JSON.parse(stored) : defaultRolePermissions;
    } catch {
      return defaultRolePermissions;
    }
  });

  const permissions = useMemo(() => {
    if (roleId === 1) return mockPermisos;
    const allowedIds = rolePermissions[roleId] || defaultRolePermissions[roleId] || [];
    return mockPermisos.filter((permission) => allowedIds.includes(permission.id_permiso));
  }, [roleId, rolePermissions]);

  const can = (modulo, accion = 'ver') => {
    const mod = String(modulo || '').toLowerCase().trim();
    const act = String(accion || 'ver').toLowerCase().trim();

    // Administrador (Rol 1) tiene acceso absoluto a todo
    if (roleId === ROLES.ADMINISTRADOR || roleId === 1) return true;

    // Consultar matriz oficial como fuente de verdad
    const roleMatrix = MATRIZ_PERMISOS[roleId];
    if (roleMatrix && roleMatrix[mod]) {
      const allowedActions = roleMatrix[mod];
      if (allowedActions.includes(act)) return true;
      if (act === 'anular' && allowedActions.includes('eliminar')) return true;
      if (act === 'eliminar' && allowedActions.includes('anular')) return true;
      if (act === 'cambiar_estado' && allowedActions.includes('editar')) return true;
      if (act === 'exportar' && allowedActions.includes('ver')) return true;
      if ((act === 'imagen' || act === 'vencimiento') && allowedActions.includes('crear')) return true;
    }

    // Fallback a los permisos dinámicos en permissions
    return permissions.some(
      (permission) =>
        permission.modulo === mod &&
        (permission.accion === act || (act === 'anular' && permission.accion === 'eliminar')) &&
        String(permission.estado).toLowerCase() === 'activo'
    );
  };

  const puedeVer = (modulo) => can(modulo, 'ver');
  const puedeHacer = (modulo, accion) => can(modulo, accion);

  const defaultRoute = useMemo(() => getDefaultRouteForRole(ROLE_NAMES[roleId]), [roleId]);
  const roleName = ROLE_NAMES[roleId] || 'Usuario';
  // Nombre, correo e iniciales son los del login. Los demás campos (cargo,
  // teléfono…) siguen siendo de demostración: el backend no los devuelve.
  const currentUserMeta = useMemo(() => {
    const demo = ROLE_DEFAULT_USERS[roleId] || {};
    const nombre = usuarioSesion.nombre || demo.nombre;
    return {
      ...demo,
      nombre,
      correo: usuarioSesion.correo || demo.correo,
      iniciales: usuarioSesion.nombre ? inicialesDe(usuarioSesion.nombre) : demo.iniciales,
    };
  }, [roleId, usuarioSesion]);

  const setActiveRole = (nextRoleId) => {
    const numId = Number(nextRoleId);
    localStorage.setItem('cenarepas_role_id', String(numId));
    // No toca el usuario guardado: antes lo reemplazaba por el de demostración.
    setUsuarioSesion(leerUsuarioGuardado());
    setRoleId(numId);
  };

  const updateRolePermissions = (nextRoleId, permissionIds) => {
    const next = { ...rolePermissions, [nextRoleId]: permissionIds };
    localStorage.setItem('cenarepas_role_permissions', JSON.stringify(next));
    setRolePermissions(next);
  };

  return (
    <PermissionContext.Provider
      value={{
        roleId,
        roleName,
        currentUserMeta,
        defaultRoute,
        setActiveRole,
        permissions,
        can,
        puedeVer,
        puedeHacer,
        updateRolePermissions,
        rolePermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) throw new Error('usePermissions debe usarse dentro de PermissionProvider');
  return context;
}

export function PermissionGate({ modulo, accion = 'ver', children }) {
  const { can } = usePermissions();
  return can(modulo, accion) ? children : null;
}
