// DELETE /clientes/:id/definitivo (clientes:eliminar; HU-104): borra solo si
// el cliente no tiene registros asociados. Corre contra el backend de Staging
// en marcha (npm run test:staging). Crea un cliente "PRUEBA - …" y lo borra en
// la misma prueba; los 409 usan los clientes PRUEBA fijos de las otras pruebas
// (documentos 9000000001 y 9000000003) sin modificarlos.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { api, login, unico } from './helpers/api.js';

let admin;
let vendedor;
let creado;

before(async () => {
  admin = await login('admin@staging.test');
  vendedor = await login('vendedor@staging.test');
});

after(async () => {
  if (creado) await api(admin, 'DELETE', `/clientes/${creado.id_cliente}/definitivo`);
});

test('sin asociados: el Vendedor recibe 403 y el Administrador lo borra', async () => {
  const sufijo = unico();
  const res = await api(vendedor, 'POST', '/clientes', {
    nombre: `PRUEBA - Cliente para eliminar ${sufijo}`,
    tipo_documento: 'CC',
    documento: `8${sufijo}`,
    telefono: '3000000009',
    direccion: 'Calle 1 # 2-3',
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  creado = res.body.data;

  const sinPermiso = await api(vendedor, 'DELETE', `/clientes/${creado.id_cliente}/definitivo`);
  assert.equal(sinPermiso.status, 403);

  const borrado = await api(admin, 'DELETE', `/clientes/${creado.id_cliente}/definitivo`);
  assert.equal(borrado.status, 200, JSON.stringify(borrado.body));
  assert.equal(borrado.body.message, 'Cliente eliminado');
  assert.equal((await api(admin, 'GET', `/clientes/${creado.id_cliente}`)).status, 404);
  creado = null;
});

test('con pedidos → 409 con el mensaje y el cliente sigue', async () => {
  const cliente = (await api(admin, 'GET', '/clientes')).body.data.find((c) => c.documento === '9000000001');
  assert.ok(cliente, 'hace falta el cliente PRUEBA 9000000001');
  const { status, body } = await api(admin, 'DELETE', `/clientes/${cliente.id_cliente}/definitivo`);
  assert.equal(status, 409);
  assert.equal(body.message, 'Este cliente tiene pedidos asociados; puedes inactivarlo.');
  assert.equal((await api(admin, 'GET', `/clientes/${cliente.id_cliente}`)).status, 200);
});

test('con cuenta en la app → 409', async () => {
  const cliente = (await api(admin, 'GET', '/clientes')).body.data.find((c) => c.documento === '9000000003');
  assert.ok(cliente, 'hace falta el cliente PRUEBA 9000000003 (lo crea abonos_editar.test.js)');
  const { status, body } = await api(admin, 'DELETE', `/clientes/${cliente.id_cliente}/definitivo`);
  assert.equal(status, 409);
  assert.equal(body.message, 'Este cliente tiene una cuenta en la app; puedes inactivarlo.');
});

test('no existe → 404', async () => {
  const { status } = await api(admin, 'DELETE', '/clientes/999999999/definitivo');
  assert.equal(status, 404);
});

test('el DELETE de siempre sigue inactivando (la web lo usa)', async () => {
  const { status } = await api(vendedor, 'DELETE', '/clientes/999999999');
  assert.equal(status, 403); // exige clientes:cambiar_estado, como antes
});
