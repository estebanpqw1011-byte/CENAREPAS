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
      const res = await api.post('/auth/login', { correo: email, contrasena: password });

      if (res?.token && res?.usuario) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.usuario));
        if (res.usuario.id_rol) {
          localStorage.setItem('cenarepas_role_id', String(res.usuario.id_rol));
        }
        setIsLoading(false);
        toast.success('¡Bienvenido al sistema CENAREPAS!');
        return { success: true, usuario: res.usuario };
      }

      throw new Error('Respuesta inválida del servidor al iniciar sesión');
    } catch (err) {
      setIsLoading(false);
      const msg = err?.data?.message || err?.message || 'Correo o contraseña incorrectos';
      setError(msg);
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  const handleRegister = async (datosRegistro) => {
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('/auth/register', datosRegistro);

      // Seguridad: solo persistir si el backend devuelve usuario y token legítimos.
      // NUNCA guardar datosRegistro (que contiene contrasena en texto plano).
      if (res?.token && res?.usuario) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.usuario));
        if (res.usuario.id_rol) {
          localStorage.setItem('cenarepas_role_id', String(res.usuario.id_rol));
        }
        setIsLoading(false);
        toast.success('¡Registro exitoso! Bienvenido a CENAREPAS.');
        return { success: true, usuario: res.usuario };
      }

      throw new Error('El servidor no devolvió una sesión válida');
    } catch (err) {
      setIsLoading(false);
      const msg = err?.data?.message || err?.message || 'Error al registrar el usuario';
      const errors = err?.data?.errors || null;
      setError(msg);
      toast.error(msg);
      return { success: false, message: msg, errors };
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

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
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
