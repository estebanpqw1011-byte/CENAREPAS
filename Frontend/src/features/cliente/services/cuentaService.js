import { api } from '../../../shared/services/api.js';

// ─── Créditos y abonos (HU-166, HU-167) ───
export const getMisCreditos = () => api.get('/mi/creditos');

/** Abono del cliente: queda "En revisión" hasta que el personal lo aprueba. */
export const registrarAbonoCliente = (idCredito, { valor, medioPago, comprobanteUrl }) =>
  api.post(`/mi/creditos/${idCredito}/abonos`, {
    valor_abonado: valor,
    medio_pago: medioPago,
    ...(comprobanteUrl ? { comprobante_url: comprobanteUrl } : {}),
  });

// ─── Perfil (HU-170) ───
export const getMiPerfil = () => api.get('/mi/perfil');

export const actualizarMiPerfil = (datos) => api.put('/mi/perfil', datos);

/** "Completa tu perfil": crea la ficha del cliente desde el token. */
export const completarMiPerfil = (datos) => api.post('/mi/perfil', datos);

export const cambiarMiContrasena = (actual, nueva) =>
  api.put('/mi/contrasena', { contrasena_actual: actual, contrasena_nueva: nueva });
