// GET /fichas-tecnicas/:id devuelve los insumos igual que el listado
// (nombre, cantidad y unidad), y el Vendedor solo puede ver (migración 007).
//
// Corre contra el backend de Staging en marcha (npm run dev:staging):
//   npm run test:staging
// Solo lectura, salvo los intentos de escribir que deben responder 403.

import { before, test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API_URL || 'http://localhost:4000/api/v1';

async function login(correo) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, contrasena: 'Staging123*' }),
  });
  assert.equal(res.status, 200, `login de ${correo}`);
  return (await res.json()).data.token;
}

async function api(token, metodo, ruta, cuerpo) {
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { status: res.status, body: await res.json() };
}

let vendedor;
let fichas;

before(async () => {
  vendedor = await login('vendedor@staging.test');
  const { status, body } = await api(vendedor, 'GET', '/fichas-tecnicas');
  assert.equal(status, 200);
  fichas = body.data;
  assert.ok(fichas.some((f) => f.insumos.length > 0), 'hace falta al menos una ficha con insumos en Staging');
});

test('el detalle trae los mismos insumos que el listado', async () => {
  for (const ficha of fichas) {
    const { status, body } = await api(vendedor, 'GET', `/fichas-tecnicas/${ficha.id_ficha}`);
    assert.equal(status, 200, `ficha ${ficha.id_ficha}`);
    assert.equal(body.data.nombre, ficha.nombre);
    assert.deepEqual(body.data.insumos, ficha.insumos, `insumos de la ficha ${ficha.id_ficha}`);
  }
});

test('cada insumo trae nombre, cantidad y unidad', async () => {
  const conInsumos = fichas.find((f) => f.insumos.length > 0);
  const { body } = await api(vendedor, 'GET', `/fichas-tecnicas/${conInsumos.id_ficha}`);
  for (const insumo of body.data.insumos) {
    assert.ok(insumo.insumo_nombre, 'insumo_nombre');
    assert.ok(Number(insumo.cantidad) > 0, 'cantidad');
    assert.ok(insumo.unidad_medida, 'unidad_medida');
  }
});

test('ficha inexistente → 404', async () => {
  const { status } = await api(vendedor, 'GET', '/fichas-tecnicas/999999');
  assert.equal(status, 404);
});

test('el Vendedor solo ve: crear y editar → 403', async () => {
  const id = fichas[0].id_ficha;
  assert.equal((await api(vendedor, 'POST', '/fichas-tecnicas', { nombre: 'No se crea' })).status, 403);
  assert.equal((await api(vendedor, 'PUT', `/fichas-tecnicas/${id}`, { nombre: 'No se edita' })).status, 403);
});
