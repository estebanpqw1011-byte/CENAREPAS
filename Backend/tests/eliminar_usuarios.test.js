// DELETE /usuarios/:id/definitivo (usuarios:eliminar, solo Administrador;
// HU-018): borra solo un usuario sin registros a su nombre. Corre contra el
// backend de Staging en marcha (npm run test:staging). Crea un usuario
// "PRUEBA - …" y lo borra en la misma prueba; el 409 usa vendedor@staging.test
// (tiene pedidos) sin modificarlo.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { CLAVE, api, login, unico } from './helpers/api.js';

let admin;
let secretaria;
let creado;

before(async () => {
  admin = await login('admin@staging.test');
  secretaria = await login('secretaria@staging.test');
});

after(async () => {
  if (creado) await api(admin, 'DELETE', `/usuarios/${creado.id_usuario}/definitivo`);
});

const usuarioPorCorreo = async (correo) =>
  (await api(admin, 'GET', '/usuarios')).body.data.find((u) => u.correo === correo);

test('sin asociados: la Secretaria recibe 403 y el Administrador lo borra', async () => {
  const vendedor = (await api(admin, 'GET', '/roles')).body.data.find((r) => r.nombre === 'Vendedor');
  const sufijo = unico();
  const res = await api(admin, 'POST', '/usuarios', {
    nombre: `PRUEBA - Usuario para eliminar ${sufijo}`,
    correo: `prueba.eliminar.${sufijo}@staging.test`,
    contrasena: CLAVE,
    id_rol: vendedor.id_rol,
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  creado = res.body.data;

  assert.equal((await api(secretaria, 'DELETE', `/usuarios/${creado.id_usuario}/definitivo`)).status, 403);

  const borrado = await api(admin, 'DELETE', `/usuarios/${creado.id_usuario}/definitivo`);
  assert.equal(borrado.status, 200, JSON.stringify(borrado.body));
  assert.equal(borrado.body.message, 'Usuario eliminado');
  assert.equal((await api(admin, 'GET', `/usuarios/${creado.id_usuario}`)).status, 404);
  creado = null;
});

test('con pedidos → 409 con el mensaje y el usuario sigue', async () => {
  const vendedor = await usuarioPorCorreo('vendedor@staging.test');
  const { status, body } = await api(admin, 'DELETE', `/usuarios/${vendedor.id_usuario}/definitivo`);
  assert.equal(status, 409);
  assert.equal(body.message, 'Este usuario tiene pedidos o ventas registrados; puedes inactivarlo.');
  assert.equal((await api(admin, 'GET', `/usuarios/${vendedor.id_usuario}`)).status, 200);
});

test('a sí mismo → 409', async () => {
  const yo = await usuarioPorCorreo('admin@staging.test');
  const { status, body } = await api(admin, 'DELETE', `/usuarios/${yo.id_usuario}/definitivo`);
  assert.equal(status, 409);
  assert.equal(body.message, 'No puedes eliminar tu propio usuario.');
});

test('no existe → 404', async () => {
  assert.equal((await api(admin, 'DELETE', '/usuarios/999999999/definitivo')).status, 404);
});
