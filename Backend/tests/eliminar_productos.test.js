// DELETE /productos/:id/definitivo (productos:eliminar; HU-093): borra solo si
// el producto no está en pedidos ni ventas. Corre contra el backend de
// Staging en marcha (npm run test:staging). Crea un producto "PRUEBA - …" y
// lo borra en la misma prueba; el 409 usa un producto de un pedido existente.

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
  if (creado) await api(admin, 'DELETE', `/productos/${creado.id_producto}/definitivo`);
});

test('sin asociados: el Vendedor recibe 403 y el Administrador lo borra', async () => {
  const categoria = (await api(admin, 'GET', '/categorias')).body.data.find((c) => c.estado === 'Activo');
  const res = await api(admin, 'POST', '/productos', {
    nombre: `PRUEBA - Producto para eliminar ${unico()}`,
    id_categoria: categoria.id_categoria,
    precio_venta: 1000,
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  creado = res.body.data;

  assert.equal((await api(vendedor, 'DELETE', `/productos/${creado.id_producto}/definitivo`)).status, 403);

  const borrado = await api(admin, 'DELETE', `/productos/${creado.id_producto}/definitivo`);
  assert.equal(borrado.status, 200, JSON.stringify(borrado.body));
  assert.equal(borrado.body.message, 'Producto eliminado');
  assert.equal((await api(admin, 'GET', `/productos/${creado.id_producto}`)).status, 404);
  creado = null;
});

test('en pedidos → 409 con el mensaje y el producto sigue', async () => {
  const pedido = (await api(admin, 'GET', '/pedidos')).body.data[0];
  const detalle = (await api(admin, 'GET', `/pedidos/${pedido.id_pedido}`)).body.data.detalles[0];
  const { status, body } = await api(admin, 'DELETE', `/productos/${detalle.id_producto}/definitivo`);
  assert.equal(status, 409);
  assert.equal(body.message, 'Este producto está en pedidos; puedes inactivarlo.');
  assert.equal((await api(admin, 'GET', `/productos/${detalle.id_producto}`)).status, 200);
});

test('no existe → 404', async () => {
  assert.equal((await api(admin, 'DELETE', '/productos/999999999/definitivo')).status, 404);
});
