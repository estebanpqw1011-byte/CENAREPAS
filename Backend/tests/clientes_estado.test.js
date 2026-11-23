// Regla de PUT /clientes/:id para el estado (decisión 7 del equipo):
//   - estado igual al actual (sin distinguir mayúsculas) → se ignora, 200;
//   - estado distinto sin clientes:cambiar_estado (Vendedor) → 403;
//   - estado distinto con el permiso (Secretaria) → 200.
//
// Corre contra el backend de Staging en marcha (npm run dev:staging):
//   npm run test:staging
// Deja el cliente con su estado original al terminar.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API_URL || 'http://localhost:4000/api/v1';
const CLAVE = 'Staging123*';

async function login(correo) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, contrasena: CLAVE }),
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
let secretaria;
let cliente;

before(async () => {
  vendedor = await login('vendedor@staging.test');
  secretaria = await login('secretaria@staging.test');
  const { body } = await api(secretaria, 'GET', '/clientes');
  cliente = body.data.find((c) => c.estado === 'Activo');
  assert.ok(cliente, 'hace falta un cliente activo en Staging');
});

after(async () => {
  await api(secretaria, 'PUT', `/clientes/${cliente.id_cliente}`, { estado: cliente.estado });
});

test('mismo estado (en otra capitalización) → se ignora y responde 200', async () => {
  const { status, body } = await api(vendedor, 'PUT', `/clientes/${cliente.id_cliente}`, {
    telefono: cliente.telefono,
    estado: 'ACTIVO',
  });
  assert.equal(status, 200);
  assert.equal(body.data.estado, 'Activo');
});

test('estado distinto sin clientes:cambiar_estado → 403 y no cambia', async () => {
  const { status, body } = await api(vendedor, 'PUT', `/clientes/${cliente.id_cliente}`, { estado: 'Inactivo' });
  assert.equal(status, 403);
  assert.equal(body.message, 'No tienes permiso para cambiar el estado del cliente');
  const actual = await api(secretaria, 'GET', `/clientes/${cliente.id_cliente}`);
  assert.equal(actual.body.data.estado, 'Activo');
});

test('estado distinto con clientes:cambiar_estado → 200 y cambia', async () => {
  const { status, body } = await api(secretaria, 'PUT', `/clientes/${cliente.id_cliente}`, { estado: 'inactivo' });
  assert.equal(status, 200);
  assert.equal(body.data.estado, 'Inactivo');
});
