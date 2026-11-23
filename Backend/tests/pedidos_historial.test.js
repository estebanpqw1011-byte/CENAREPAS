// d) Historial de estados del pedido (migración 010, GET /pedidos/:id/historial).
//
// Corre contra el backend de Staging en marcha (npm run dev:staging):
//   npm run test:staging
// Usa UN solo pedido por corrida, del cliente "PRUEBA - …" (documento
// 9000000001), para todos los casos en orden: creación, En proceso, un cambio
// rechazado (409) y la anulación al final. Queda Anulado (los pedidos no se
// eliminan) y no toca el stock (nunca pasa por Entregado).
// La reconstrucción y el 404 usan pedidos existentes: no crean nada.

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
  return (await res.json()).data;
}

async function api(token, metodo, ruta, cuerpo) {
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { status: res.status, body: await res.json() };
}

const historial = async (id) => (await api(token, 'GET', `/pedidos/${id}/historial`)).body.data;
const pasos = (filas) => filas.map((h) => [h.estado_anterior, h.estado_nuevo]);

let token;
let idUsuario;
let pedido;

before(async () => {
  const sesion = await login('vendedor@staging.test');
  token = sesion.token;
  idUsuario = sesion.usuario.id_usuario;

  const clientes = (await api(token, 'GET', '/clientes')).body.data;
  const cliente = clientes.find((c) => c.documento === '9000000001');
  assert.ok(cliente, 'hace falta el cliente PRUEBA (lo crea tests/clientes_campos.test.js)');
  const productos = (await api(token, 'GET', '/productos')).body.data;
  const producto = productos.find((p) => p.estado === 'Activo');
  const manana = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);

  const creado = await api(token, 'POST', '/pedidos', {
    id_cliente: cliente.id_cliente,
    fecha_entrega: manana,
    medio_pago: 'Efectivo',
    observaciones: 'PRUEBA - pedido de tests/pedidos_historial.test.js',
    detalles: [{ id_producto: producto.id_producto, cantidad: 1 }],
  });
  assert.equal(creado.status, 201);
  pedido = creado.body.data;
});

test('1. al crear el pedido queda la fila Pendiente', async () => {
  const filas = await historial(pedido.id_pedido);
  assert.deepEqual(pasos(filas), [[null, 'Pendiente']]);
  assert.equal(Number(filas[0].id_usuario), Number(idUsuario));
  assert.equal(filas[0].usuario_nombre, 'Vendedor Staging');
  assert.equal(filas[0].rol_nombre, 'Vendedor');
  assert.equal(filas[0].reconstruido, false);
});

test('2. del usuario solo trae nombre y rol: nada de correo', async () => {
  const filas = await historial(pedido.id_pedido);
  const texto = JSON.stringify(filas);
  assert.ok(!texto.includes('@'), 'la respuesta no debe incluir ningún correo');
  for (const fila of filas) {
    assert.deepEqual(
      Object.keys(fila).sort(),
      ['estado_anterior', 'estado_nuevo', 'fecha_cambio', 'id_historial', 'id_pedido', 'id_usuario',
        'motivo', 'reconstruido', 'rol_nombre', 'usuario_nombre'],
    );
  }
});

test('3. pasar a En proceso agrega su fila', async () => {
  assert.equal((await api(token, 'PATCH', `/pedidos/${pedido.id_pedido}/estado`, { estado: 'En proceso' })).status, 200);
  assert.deepEqual(pasos(await historial(pedido.id_pedido)), [[null, 'Pendiente'], ['Pendiente', 'En proceso']]);
});

test('4. un cambio rechazado (409) no deja fila', async () => {
  const rechazado = await api(token, 'PATCH', `/pedidos/${pedido.id_pedido}/estado`, { estado: 'Pendiente' });
  assert.equal(rechazado.status, 409);
  assert.equal((await historial(pedido.id_pedido)).length, 2);
});

test('5. la anulación (al final) guarda el motivo, quién y cuándo', async () => {
  const anulado = await api(token, 'PATCH', `/pedidos/${pedido.id_pedido}/estado`, {
    estado: 'Anulado',
    motivo: 'PRUEBA - anulación de la prueba de historial',
  });
  assert.equal(anulado.status, 200);

  const filas = await historial(pedido.id_pedido);
  assert.deepEqual(pasos(filas), [[null, 'Pendiente'], ['Pendiente', 'En proceso'], ['En proceso', 'Anulado']]);
  const anulacion = filas[2];
  assert.equal(anulacion.motivo, 'PRUEBA - anulación de la prueba de historial');
  assert.equal(anulacion.usuario_nombre, 'Vendedor Staging');
  assert.ok(new Date(anulacion.fecha_cambio) >= new Date(filas[1].fecha_cambio));
});

test('6. los pedidos anteriores a la migración tienen su historial reconstruido', async () => {
  const pedidos = (await api(token, 'GET', '/pedidos')).body.data;
  // El más antiguo (la lista viene del más reciente al más antiguo): existía
  // antes de la migración.
  const entregado = pedidos.filter((p) => p.estado === 'Entregado').at(-1);
  const reconstruidas = (await historial(entregado.id_pedido)).filter((h) => h.reconstruido);
  assert.deepEqual(pasos(reconstruidas), [[null, 'Pendiente'], ['En proceso', 'Entregado']]);
});

test('7. pedido inexistente → 404', async () => {
  const { status } = await api(token, 'GET', '/pedidos/999999/historial');
  assert.equal(status, 404);
});

test('8. GET /mi/pedidos/:id trae el historial del pedido del cliente, sin datos del personal', async () => {
  // Solo lee: el cliente fijo de las pruebas de abonos ya tiene pedidos.
  const cliente = await login('prueba.abonos@staging.test');
  const [primero] = (await api(cliente.token, 'GET', '/mi/pedidos')).body.data;
  assert.ok(primero, 'el cliente de prueba debe tener al menos un pedido');

  const { status, body } = await api(cliente.token, 'GET', `/mi/pedidos/${primero.id_pedido}`);
  assert.equal(status, 200);
  const filas = body.data.historial;
  assert.ok(Array.isArray(filas) && filas.length > 0);
  assert.deepEqual(pasos(filas), pasos(await historial(primero.id_pedido)));
  for (const h of filas) {
    assert.deepEqual(
      Object.keys(h).sort(),
      ['estado_anterior', 'estado_nuevo', 'fecha_cambio', 'motivo', 'propio', 'reconstruido', 'rol_nombre']
    );
  }
});
