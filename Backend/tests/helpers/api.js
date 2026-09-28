// Ayudas para las pruebas contra el backend de Staging en marcha. No termina
// en .test.js: node --test no la ejecuta como prueba.

import assert from 'node:assert/strict';

export const BASE = process.env.API_URL || 'http://localhost:4000/api/v1';
export const CLAVE = 'Staging123*';

export async function api(token, metodo, ruta, cuerpo) {
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { status: res.status, body: await res.json() };
}

export async function login(correo) {
  const res = await api(null, 'POST', '/auth/login', { correo, contrasena: CLAVE });
  assert.equal(res.status, 200, `login de ${correo}`);
  return res.body.data.token;
}

/** Sufijo único por corrida para nombres y documentos "PRUEBA - …". */
export const unico = () => `${Date.now()}`.slice(-9);
