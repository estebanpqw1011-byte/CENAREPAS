// Cambio b): POST y PUT /clientes guardan tipo_documento, municipio y barrio.
//
// Corre contra el backend de Staging en marcha (npm run dev:staging):
//   npm run test:staging
// Usa un cliente de prueba fijo (documento 9000000001, nombre "PRUEBA - …"):
// lo crea la primera vez y en las siguientes lo reutiliza y reinicia. Los
// clientes no se eliminan.

import { before, test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API_URL || 'http://localhost:4000/api/v1';
const DOCUMENTO = '9000000001';
// Empieza por "PRUEBA -" para no confundirlo con un cliente real.
const NOMBRE = 'PRUEBA - Cliente de las pruebas del backend';

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
let cliente;

before(async () => {
  vendedor = await login('vendedor@staging.test');
  const { body } = await api(vendedor, 'GET', '/clientes');
  cliente = body.data.find((c) => c.documento === DOCUMENTO);
  const valores = { tipo_documento: 'nit', municipio: 'Bello', barrio: 'Niquía' };
  if (!cliente) {
    // Primera corrida: lo crea con POST.
    const creado = await api(vendedor, 'POST', '/clientes', {
      nombre: NOMBRE,
      documento: DOCUMENTO,
      telefono: '3000000001',
      direccion: 'Calle 1 # 2-3',
      ...valores,
    });
    assert.equal(creado.status, 201);
    cliente = creado.body.data;
  } else {
    // Corridas siguientes: vuelve a los valores iniciales con PUT.
    const reiniciado = await api(vendedor, 'PUT', `/clientes/${cliente.id_cliente}`, { nombre: NOMBRE, ...valores });
    assert.equal(reiniciado.status, 200);
  }
});

test('guarda tipo de documento (normalizado), municipio y barrio', async () => {
  const { body } = await api(vendedor, 'GET', `/clientes/${cliente.id_cliente}`);
  assert.equal(body.data.nombre, NOMBRE);
  assert.equal(body.data.tipo_documento, 'NIT');
  assert.equal(body.data.municipio, 'Bello');
  assert.equal(body.data.barrio, 'Niquía');
});

test('PUT actualiza tipo de documento, municipio y barrio', async () => {
  const { status, body } = await api(vendedor, 'PUT', `/clientes/${cliente.id_cliente}`, {
    tipo_documento: 'CC',
    municipio: 'Envigado',
    barrio: 'Zúñiga',
  });
  assert.equal(status, 200);
  assert.equal(body.data.tipo_documento, 'CC');
  assert.equal(body.data.municipio, 'Envigado');
  assert.equal(body.data.barrio, 'Zúñiga');
});

test('PUT sin esos campos (como la web) los conserva', async () => {
  const { status, body } = await api(vendedor, 'PUT', `/clientes/${cliente.id_cliente}`, {
    nombre: NOMBRE,
  });
  assert.equal(status, 200);
  assert.equal(body.data.municipio, 'Envigado');
  assert.equal(body.data.barrio, 'Zúñiga');
});

test('valores inválidos → 400 con el error por campo, sin guardar', async () => {
  const { status, body } = await api(vendedor, 'PUT', `/clientes/${cliente.id_cliente}`, {
    tipo_documento: 'RUT',
    municipio: 'Cali',
  });
  assert.equal(status, 400);
  assert.ok(body.errors.tipo_documento);
  assert.ok(body.errors.municipio);
  const actual = await api(vendedor, 'GET', `/clientes/${cliente.id_cliente}`);
  assert.equal(actual.body.data.municipio, 'Envigado');
});

test('POST con un tipo de documento inválido → 400 y no crea', async () => {
  const { status, body } = await api(vendedor, 'POST', '/clientes', {
    nombre: 'No se crea',
    tipo_documento: 'XX',
    documento: '9000000002',
    telefono: '3000000002',
    direccion: 'Calle 1 # 2-3',
  });
  assert.equal(status, 400);
  assert.ok(body.errors.tipo_documento);
  const todos = await api(vendedor, 'GET', '/clientes');
  assert.ok(!todos.body.data.some((c) => c.documento === '9000000002'));
});
