// "Completa tu perfil" (POST /mi/perfil): crea la ficha del cliente desde el
// token. Corre contra el backend de Staging en marcha (npm run test:staging).
// Solo usa un cliente que YA tiene ficha, así que no crea nada: el alta
// completa se prueba a mano con un usuario Cliente sin ficha (ver HANDOFF.md).

import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API_URL || 'http://localhost:4000/api/v1';

async function api(token, metodo, ruta, cuerpo) {
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { status: res.status, body: await res.json() };
}

const fichaValida = {
  nombre: 'PRUEBA - no se guarda', tipo_documento: 'CC', documento: '9000000099',
  telefono: '3000000000', municipio: 'Medellín', barrio: 'Centro', direccion: 'Calle 1 # 2-3',
};

let token;

test('login del cliente fijo de las pruebas de abonos', async () => {
  const { status, body } = await api(null, 'POST', '/auth/login', { correo: 'prueba.abonos@staging.test', contrasena: 'Staging123*' });
  assert.equal(status, 200);
  token = body.data.token;
});

test('con ficha: POST /mi/perfil → 409 y no crea otra', async () => {
  const { status, body } = await api(token, 'POST', '/mi/perfil', fichaValida);
  assert.equal(status, 409);
  assert.equal(body.message, 'Tu perfil ya está completo');
});

test('datos inválidos → 400 con el error por campo', async () => {
  const { status, body } = await api(token, 'POST', '/mi/perfil', { ...fichaValida, documento: '1', municipio: 'Rionegro' });
  assert.equal(status, 400);
  assert.ok(body.errors.documento);
  assert.ok(body.errors.municipio);
});

test('sin sesión → 401', async () => {
  const { status } = await api(null, 'POST', '/mi/perfil', fichaValida);
  assert.equal(status, 401);
});
