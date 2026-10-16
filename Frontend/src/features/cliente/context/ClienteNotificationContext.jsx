import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../../../shared/services/api';

const ClienteNotificationContext = createContext(null);

export function ClienteNotificationProvider({ children }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(false);

  const cargarNotificaciones = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      setCargando(true);
      const data = (await api.get('/mi/notificaciones')) || {};
      setNotificaciones(data.notificaciones || []);
      setNoLeidas(data.no_leidas || 0);
    } catch (e) {
      // Es un sondeo de fondo: no interrumpe la pantalla, pero queda en la consola.
      console.warn('[Notificaciones] No se pudieron cargar:', e?.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarNotificaciones();
    // Sondeo suave cada 45 segundos si la pestaña está activa
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        cargarNotificaciones();
      }
    }, 45000);
    return () => clearInterval(timer);
  }, [cargarNotificaciones]);

  const marcarLeida = async (id_notificacion) => {
    try {
      await api.patch(`/mi/notificaciones/${id_notificacion}/leida`);
      setNotificaciones((prev) =>
        prev.map((n) => (n.id_notificacion === id_notificacion ? { ...n, leida: true } : n))
      );
      setNoLeidas((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Error al marcar notificación como leída:', e);
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      await api.patch('/mi/notificaciones/leidas');
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setNoLeidas(0);
    } catch (e) {
      console.error('Error al marcar todas las notificaciones como leídas:', e);
    }
  };

  return (
    <ClienteNotificationContext.Provider
      value={{
        notificaciones,
        noLeidas,
        cargando,
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
