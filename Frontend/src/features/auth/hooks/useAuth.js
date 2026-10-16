import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../../shared/services/api.js';
import { toast } from '../../../shared/utils/toast.jsx';

export const useAuth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const simulateApiCall = async (duration = 500) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, duration));
    setIsLoading(false);
  };

  const handleLogin = async (email, password) => {
    setError('');
    setIsLoading(true);
    try {
      // Sin sesión de respaldo: si el backend no responde o rechaza el acceso,
      // el usuario ve el error en vez de entrar con un token que el backend no acepta.
      const res = await api.post('/auth/login', { correo: email, contrasena: password });

      if (res?.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.usuario || { correo: email }));
        if (res.usuario?.id_rol) {
          localStorage.setItem('cenarepas_role_id', String(res.usuario.id_rol));
        }
      }
      setIsLoading(false);
      toast.success('¡Bienvenido al sistema CENAREPAS!');
      return true;
    } catch (err) {
      setIsLoading(false);
      const msg = err?.message || 'Correo o contraseña incorrectos';
      setError(msg);
      toast.error(msg);
      return false;
    }
  };



  const handleRegister = async ({ nombre, correo, contrasena, id_rol = 3 }) => {
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register', { nombre, correo, contrasena, id_rol });

      if (res?.token) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.usuario || { nombre, correo, id_rol }));
        if (res.usuario?.id_rol) {
          localStorage.setItem('cenarepas_role_id', String(res.usuario.id_rol));
        }
      }
      setIsLoading(false);
      toast.success('¡Registro exitoso! Bienvenido a CENAREPAS.');
      return true;
    } catch (err) {
      setIsLoading(false);
      const msg = err?.message || 'Error al registrar el usuario';
      setError(msg);
      toast.error(msg);
      return false;
    }
  };

  const handleForgotPassword = async (email) => {
    setError('');
    await simulateApiCall();
    return true;
  };

  const handleVerifyCode = async (code) => {
    setError('');
    await simulateApiCall();
    return true;
  };

  const handleResetPassword = async (newPassword, confirmPassword) => {
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }

    await simulateApiCall();
    return true;
  };

  return {
    isLoading,
    error,
    setError,
    handleLogin,
    handleRegister,
    handleForgotPassword,
    handleVerifyCode,
    handleResetPassword,
    navigate,
  };
};
