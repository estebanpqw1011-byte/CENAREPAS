import { useCallback, useState } from 'react';
import { anularVenta } from '../services/ventasService';
import { toast } from '../../../shared/utils/toast';

// Igual que en el backend (config/negocio.js): el servidor es quien decide.
export const ROLES_ANULAR_VENTA = ['Administrador'];
export const MOTIVO_ANULACION_MIN = 10;
export const MOTIVO_ANULACION_MAX = 255;

function rolDeSesion() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')?.rol || '';
  } catch {
    return '';
  }
}

/**
 * Estado del botón "Anular venta": horas restantes (las calcula el backend con
 * HORAS_LIMITE_ANULACION desde la entrega) y si el rol de la sesión puede anular.
 */
export function plazoAnulacion(venta) {
  const horas = venta?.horas_para_anular == null ? 0 : Number(venta.horas_para_anular);
  return {
    vigente: horas > 0,
    horasRestantes: Math.max(1, Math.floor(horas)),
    puedeAnularRol: ROLES_ANULAR_VENTA.includes(rolDeSesion()),
  };
}

/** Modal de anulación: motivo obligatorio y envío al backend. onAnulada recarga la lista. */
export function useAnularVenta(onAnulada) {
  const [venta, setVenta] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const abrir = useCallback((v) => {
    setError('');
    setVenta(v);
  }, []);

  const cerrar = () => {
    if (!enviando) setVenta(null);
  };

  const confirmar = async (motivo) => {
    const limpio = motivo.trim();
    if (limpio.length < MOTIVO_ANULACION_MIN) {
      setError(`Escribe el motivo de la anulación (mínimo ${MOTIVO_ANULACION_MIN} caracteres).`);
      return;
    }
    setEnviando(true);
    setError('');
    try {
      await anularVenta(venta.id_venta, limpio);
      toast.success(`La venta #${venta.id_venta} fue anulada`);
      setVenta(null);
      onAnulada?.();
    } catch (err) {
      setError(
        err?.status === 401
          ? 'Tu sesión expiró. Inicia sesión de nuevo para anular la venta.'
          : err?.data?.message || err?.message || 'No se pudo anular la venta'
      );
    } finally {
      setEnviando(false);
    }
  };

  return { venta, abrir, cerrar, confirmar, enviando, error, limpiarError: () => setError('') };
}
