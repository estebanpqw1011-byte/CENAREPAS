import { ROLE_DEFAULT_USERS } from '../../../shared/config/permisos';

// profileService.js - Servicio para datos de perfil y seguridad
export const getProfile = async (roleId = 1) => {
  let storedUser = null;
  try {
    const raw = localStorage.getItem('user');
    if (raw) storedUser = JSON.parse(raw);
  } catch {
    // ignore
  }

  const numRoleId = Number(roleId) || Number(storedUser?.id_rol) || 1;
  const meta = ROLE_DEFAULT_USERS[numRoleId] || ROLE_DEFAULT_USERS[1];

  return {
    nombre: storedUser?.nombre || meta.nombre,
    email: storedUser?.correo || meta.correo,
    telefono: storedUser?.telefono || meta.telefono,
    cargo: meta.cargo,
    fechaCreacion: meta.fechaCreacion,
    ultimoAcceso: meta.ultimoAcceso,
  };
};

export const updateProfile = async (profileData) => {
  return { success: true, data: profileData };
};

export const changePassword = async (passwordData) => {
  return { success: true };
};

export const getActiveSessions = async () => {
  return [
    { id: 1, dispositivo: 'Chrome en Windows', ubicacion: 'New York, USA', fecha: 'Ahora', actual: true },
    { id: 2, dispositivo: 'Safari en iPhone', ubicacion: 'Los Angeles, USA', fecha: 'Hace 2 días', actual: false },
    { id: 3, dispositivo: 'Firefox en macOS', ubicacion: 'Miami, USA', fecha: 'Hace 5 días', actual: false },
  ];
};
