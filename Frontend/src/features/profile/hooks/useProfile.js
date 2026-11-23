import { useState, useEffect } from 'react';
import { getProfile, updateProfile, changePassword, getActiveSessions } from '../services/profileService';
import { usePermissions } from '../../../shared/contexts/PermissionContext';
import { ROLE_DEFAULT_USERS } from '../../../shared/config/permisos';
import { toast } from '../../../shared/utils/toast';

export function useProfile() {
  const { roleId, currentUserMeta, roleName } = usePermissions();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);

  const [profileData, setProfileData] = useState(() => {
    let storedUser = null;
    try {
      const raw = localStorage.getItem('user');
      if (raw) storedUser = JSON.parse(raw);
    } catch {
      // ignore
    }
    const meta = currentUserMeta || ROLE_DEFAULT_USERS[roleId] || ROLE_DEFAULT_USERS[1];
    return {
      nombre: storedUser?.nombre || meta.nombre,
      email: storedUser?.correo || meta.correo,
      telefono: storedUser?.telefono || meta.telefono,
      cargo: meta.cargo,
      fechaCreacion: meta.fechaCreacion,
      ultimoAcceso: meta.ultimoAcceso,
      iniciales: meta.iniciales,
    };
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    getProfile(roleId).then(data => {
      const meta = currentUserMeta || ROLE_DEFAULT_USERS[roleId] || ROLE_DEFAULT_USERS[1];
      setProfileData(prev => ({
        ...prev,
        ...data,
        cargo: meta.cargo,
        iniciales: meta.iniciales,
      }));
    });
    getActiveSessions().then(data => setSessions(data));
  }, [roleId, currentUserMeta, roleName]);

  const handleSaveProfile = async () => {
    try {
      setIsEditing(false);
      await updateProfile(profileData);
      toast.success('Perfil actualizado');
    } catch {
      toast.error('No se pudo actualizar el perfil');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    try {
      await changePassword(passwordData);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Contraseña actualizada');
    } catch {
      toast.error('No se pudo actualizar la contraseña');
    }
  };

  return {
    activeTab,
    setActiveTab,
    isEditing,
    setIsEditing,
    profileData,
    setProfileData,
    passwordData,
    setPasswordData,
    sessions,
    handleSaveProfile,
    handleChangePassword,
  };
}
