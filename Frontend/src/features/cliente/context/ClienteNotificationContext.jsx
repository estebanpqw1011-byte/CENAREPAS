import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../../../shared/services/api';

const ClienteNotificationContext = createContext(null);

/**
 * Notificaciones del cliente (HU-168, HU-169). Con activo=false (usuario sin
 * ficha: /mi/notificaciones respondería 403) no consulta nada.
 */
export function ClienteNotificationProvider({ children, activo = true }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const cargarNotificaciones = useCallback(async () => {
    if (!activo) return;
    try {
      setCargando(true);
      const data = (await api.get('/mi/notificaciones')) || {};
      setNotificaciones(data.notificaciones || []);
      setNoLeidas(data.no_leidas || 0);
      setError('');
    } catch (e) {
      // El sondeo no interrumpe la pantalla; la página de notificaciones muestra el error.
      setError(e?.message || 'No se pudieron cargar tus notificaciones.');
    } finally {
      setCargando(false);
    }
  }, [activo]);

  useEffect(() => {
    if (!activo) {
      setNotificaciones([]);
      setNoLeidas(0);
      return undefined;
    }
    cargarNotificaciones();
    // Sondeo suave cada 45 segundos si la pestaña está activa
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        cargarNotificaciones();
      }
    }, 45000);
    return () => clearInterval(timer);
  }, [activo, cargarNotificaciones]);

  const marcarLeida = async (id_notificacion) => {
    try {
      await api.patch(`/mi/notificaciones/${id_notificacion}/leida`);
      setNotificaciones((prev) =>
        prev.map((n) => (n.id_notificacion === id_notificacion ? { ...n, leida: true } : n))
      );
      setNoLeidas((prev) => Math.max(0, prev - 1));
      return true;
    } catch (e) {
      setError(e?.message || 'No se pudo marcar la notificación como leída.');
      return false;
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      await api.patch('/mi/notificaciones/leidas');
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setNoLeidas(0);
      return true;
    } catch (e) {
      setError(e?.message || 'No se pudieron marcar las notificaciones como leídas.');
      return false;
    }
  };

  return (
    <ClienteNotificationContext.Provider
      value={{
        notificaciones,
        noLeidas,
        cargando,
        error,
        marcarLeida,
        marcarTodasLeidas,
        recargar: cargarNotificaciones,
      }}
    >
      {children}
    </ClienteNotificationContext.Provider>
  );
}

export function useClienteNotifications() {
  const ctx = useContext(ClienteNotificationContext);
  if (!ctx) {
    throw new Error('useClienteNotifications debe usarse dentro de ClienteNotificationProvider');
  }
  return ctx;
}
