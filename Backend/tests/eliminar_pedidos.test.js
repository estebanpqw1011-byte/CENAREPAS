// DELETE /pedidos/:id/definitivo (pedidos:eliminar): borra solo un pedido
// Pendiente sin abonos, con su detalle y su historial. Corre contra el backend
// de Staging en marcha (npm run test:staging). Crea un pedido "PRUEBA - …"
// para el cliente PRUEBA 9000000001 y lo borra en la misma prueba; los 409
// usan el pedido fijo de las pruebas de abonos y un pedido Anulado.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { api, login } from './helpers/api.js';

let secretaria;
let vendedor;
let creado;

const dia = (valor) => new Date(valor).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const manana = () => {
  const d = new Date(`${dia(Date.now())}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

before(async () => {
  secretaria = await login('secretaria@staging.test');
  vendedor = await login('vendedor@staging.test');
});

after(async () => {
  if (creado) await api(secretaria, 'DELETE', `/pedidos/${creado.id_pedido}/definitivo`);
});

test('Pendiente sin abonos: el Vendedor recibe 403 y la Secretaria lo borra con su historial', async () => {
  const cliente = (await api(secretaria, 'GET', '/clientes')).body.data.find((c) => c.documento === '9000000001');
  const producto = (await api(secretaria, 'GET', '/productos')).body.data.find((p) => p.estado === 'Activo');
  const res = await api(secretaria, 'POST', '/pedidos', {
    id_cliente: cliente.id_cliente,
    fecha_entrega: manana(),
    medio_pago: 'Efectivo',
    observaciones: 'PRUEBA - pedido para eliminar',
    detalles: [{ id_producto: producto.id_producto, cantidad: 1 }],
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  creado = res.body.data;
  assert.ok((await api(secretaria, 'GET', `/pedidos/${creado.id_pedido}/historial`)).body.data.length >= 1);

  assert.equal((await api(vendedor, 'DELETE', `/pedidos/${creado.id_pedido}/definitivo`)).status, 403);

  const borrado = await api(secretaria, 'DELETE', `/pedidos/${creado.id_pedido}/definitivo`);
  assert.equal(borrado.status, 200, JSON.stringify(borrado.body));
  assert.equal(borrado.body.message, 'Pedido eliminado');
  assert.equal((await api(secretaria, 'GET', `/pedidos/${creado.id_pedido}`)).status, 404);
  assert.equal((await api(secretaria, 'GET', `/pedidos/${creado.id_pedido}/historial`)).status, 404);
  creado = null;
});

test('con abonos → 409', async () => {
  const pedidos = (await api(secretaria, 'GET', '/pedidos')).body.data;
  const conAbonos = pedidos.find((p) => p.estado === 'Pendiente' && p.observaciones === 'PRUEBA - pedido fijo de las pruebas de abonos');
  assert.ok(conAbonos, 'hace falta el pedido fijo de las pruebas de abonos (abonos_fecha_filtros.test.js)');
  const { status, body } = await api(secretaria, 'DELETE', `/pedidos/${conAbonos.id_pedido}/definitivo`);
  assert.equal(status, 409);
  assert.equal(body.message, 'Este pedido tiene abonos; anúlalo con un motivo.');
});

test('Anulado → 409', async () => {
  const anulado = (await api(secretaria, 'GET', '/pedidos')).body.data.find((p) => p.estado === 'Anulado');
  assert.ok(anulado, 'hace falta un pedido Anulado');
  const { status, body } = await api(secretaria, 'DELETE', `/pedidos/${anulado.id_pedido}/definitivo`);
  assert.equal(status, 409);
  assert.equal(body.message, 'Este pedido ya está anulado y no se puede eliminar.');
});

test('En proceso o Entregado → 409 que pide anular', async () => {
  const otro = (await api(secretaria, 'GET', '/pedidos')).body.data.find((p) => ['En proceso', 'Entregado'].includes(p.estado));
  assert.ok(otro, 'hace falta un pedido En proceso o Entregado');
  const { status, body } = await api(secretaria, 'DELETE', `/pedidos/${otro.id_pedido}/definitivo`);
  assert.equal(status, 409);
  assert.equal(body.message, `Solo se puede eliminar un pedido Pendiente; este está ${otro.estado}. Anúlalo con un motivo.`);
});

test('no existe → 404', async () => {
  assert.equal((await api(secretaria, 'DELETE', '/pedidos/999999999/definitivo')).status, 404);
});
