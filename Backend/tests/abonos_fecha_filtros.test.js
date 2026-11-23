// e) Fecha del abono elegible (POST /abonos) y filtros de GET /abonos.
//
// Corre contra el backend de Staging en marcha (npm run dev:staging):
//   npm run test:staging
// Datos que usa:
//   - Un pedido FIJO del cliente "PRUEBA - …" (observaciones "PRUEBA - pedido
//     fijo de las pruebas de abonos"): se crea la primera vez, con un total
//     alto (CANTIDAD_FIJO unidades), y se reutiliza; cada corrida solo le suma
//     2 abonos de $1. Si su crédito ya no está Activo (o no le alcanza el
//     saldo), se crea otro pedido fijo y se avisa en el log.
//   - Para "más de 7 días" usa el pedido no anulado más antiguo de Staging
//     (de más de 8 días): la validación responde 400 antes de escribir nada.

import { before, test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API_URL || 'http://localhost:4000/api/v1';
const DIAS_MAX = 7; // ABONO_DIAS_ATRAS_MAX en src/config/negocio.js
const OBS_FIJO = 'PRUEBA - pedido fijo de las pruebas de abonos';
const CANTIDAD_FIJO = 100; // total alto: miles de corridas antes de quedar Pagado
const ABONOS_POR_CORRIDA = 2; // de $1 cada uno

async function api(token, metodo, ruta, cuerpo) {
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { status: res.status, body: await res.json() };
}

/** Día (AAAA-MM-DD) en Colombia de un instante o de una columna DATE. */
const dia = (valor) => new Date(valor).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const hoy = dia(Date.now());
const masDias = (fecha, n) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

let token;
let cliente;
let fijo;
const creados = [];

before(async () => {
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: 'vendedor@staging.test', contrasena: 'Staging123*' }),
  });
  token = (await login.json()).data.token;

  cliente = (await api(token, 'GET', '/clientes')).body.data.find((c) => c.documento === '9000000001');
  assert.ok(cliente, 'hace falta el cliente PRUEBA (lo crea tests/clientes_campos.test.js)');

  // El pedido fijo sirve mientras no esté anulado y su crédito (si ya tiene)
  // siga Activo con saldo para los abonos de esta corrida.
  const sirve = (p) =>
    p.observaciones === OBS_FIJO &&
    p.estado !== 'Anulado' &&
    (p.id_credito == null || (p.credito_estado === 'Activo' && Number(p.credito_saldo) >= ABONOS_POR_CORRIDA));
  const pedidos = (await api(token, 'GET', '/pedidos')).body.data;
  fijo = pedidos.find(sirve);
  if (!fijo) {
    const anterior = pedidos.find((p) => p.observaciones === OBS_FIJO);
    const producto = (await api(token, 'GET', '/productos')).body.data.find((p) => p.estado === 'Activo');
    const creado = await api(token, 'POST', '/pedidos', {
      id_cliente: cliente.id_cliente,
      fecha_entrega: masDias(hoy, 1),
      medio_pago: 'Efectivo',
      observaciones: OBS_FIJO,
      detalles: [{ id_producto: producto.id_producto, cantidad: CANTIDAD_FIJO }],
    });
    assert.equal(creado.status, 201);
    fijo = creado.body.data;
    console.log(
      anterior
        ? `[abonos] El pedido fijo #${anterior.id_pedido} ya no sirve (estado ${anterior.estado}, crédito ${anterior.credito_estado ?? 'sin crédito'}, saldo ${anterior.credito_saldo ?? '-'}): se creó el pedido fijo #${fijo.id_pedido}.`
        : `[abonos] Se creó el pedido fijo #${fijo.id_pedido} (total ${fijo.valor_total}).`
    );
  }
});

const abonar = (idPedido, fecha) =>
  api(token, 'POST', '/abonos', {
    id_pedido: idPedido,
    valor_abonado: 1,
    medio_pago: 'Efectivo',
    ...(fecha === undefined ? {} : { fecha_abono: fecha }),
  });

test('sin fecha: el abono queda con la fecha de hoy', async () => {
  const { status, body } = await abonar(fijo.id_pedido);
  assert.equal(status, 201, JSON.stringify(body));
  assert.equal(dia(body.data.fecha_abono), hoy);
  creados.push(body.data.id_abono);
});

test('fecha válida: se guarda la elegida (la más antigua permitida para el pedido)', async () => {
  // La más antigua que admite este pedido: el día del pedido o hace 7 días.
  const desdePedido = dia(fijo.fecha_pedido);
  const limite = masDias(hoy, -DIAS_MAX);
  const fecha = desdePedido > limite ? desdePedido : limite;
  const { status, body } = await abonar(fijo.id_pedido, fecha);
  assert.equal(status, 201, JSON.stringify(body));
  assert.equal(dia(body.data.fecha_abono), fecha);
  // fecha_registro es el momento real del registro.
  assert.equal(dia(body.data.fecha_registro), hoy);
  creados.push(body.data.id_abono);
});

test('fecha futura → 400', async () => {
  const { status, body } = await abonar(fijo.id_pedido, masDias(hoy, 1));
  assert.equal(status, 400);
  assert.equal(body.errors.fecha_abono, 'La fecha del abono no puede ser futura');
});

test('anterior a la fecha del pedido → 400 (dice la fecha del pedido)', async () => {
  const { status, body } = await abonar(fijo.id_pedido, masDias(dia(fijo.fecha_pedido), -1));
  assert.equal(status, 400);
  assert.match(body.errors.fecha_abono, /^La fecha del abono no puede ser anterior a la fecha del pedido \(\d{2}\/\d{2}\/\d{4}\)$/);
});

test(`de hace más de ${DIAS_MAX} días → 400 (dice el límite) y no escribe nada`, async () => {
  const pedidos = (await api(token, 'GET', '/pedidos')).body.data;
  const viejo = pedidos
    .filter((p) => p.estado !== 'Anulado' && dia(p.fecha_pedido) <= masDias(hoy, -(DIAS_MAX + 2)))
    .sort((a, b) => new Date(a.fecha_pedido) - new Date(b.fecha_pedido))[0];
  assert.ok(viejo, `hace falta un pedido no anulado de hace más de ${DIAS_MAX + 1} días`);
  const antes = (await api(token, 'GET', `/abonos?id_pedido=${viejo.id_pedido}`)).body.data.length;

  const { status, body } = await abonar(viejo.id_pedido, masDias(hoy, -(DIAS_MAX + 1)));
  assert.equal(status, 400);
  assert.match(body.errors.fecha_abono, new RegExp(`de hace más de ${DIAS_MAX} días \\(la más antigua permitida es el \\d{2}/\\d{2}/\\d{4}\\)`));
  assert.equal((await api(token, 'GET', `/abonos?id_pedido=${viejo.id_pedido}`)).body.data.length, antes);
});

test('fecha que no existe → 400', async () => {
  const { status, body } = await abonar(fijo.id_pedido, '2026-02-31');
  assert.equal(status, 400);
  assert.ok(body.errors.fecha_abono);
});

test('filtro id_cliente: solo abonos de ese cliente, incluidos los nuevos', async () => {
  const { status, body } = await api(token, 'GET', `/abonos?id_cliente=${cliente.id_cliente}`);
  assert.equal(status, 200);
  assert.ok(body.data.length >= 2);
  assert.ok(body.data.every((a) => a.id_cliente === cliente.id_cliente));
  for (const id of creados) assert.ok(body.data.some((a) => a.id_abono === id), `falta el abono ${id}`);
});

test('filtros desde y hasta (incluidos) sobre la fecha del abono', async () => {
  const { status, body } = await api(token, 'GET', `/abonos?id_cliente=${cliente.id_cliente}&desde=${hoy}&hasta=${hoy}`);
  assert.equal(status, 200);
  assert.ok(body.data.length >= 1);
  assert.ok(body.data.every((a) => dia(a.fecha_abono) === hoy));

  const futuro = await api(token, 'GET', `/abonos?desde=${masDias(hoy, 1)}`);
  assert.equal(futuro.status, 200);
  assert.equal(futuro.body.data.length, 0);
});

test('"desde" posterior a "hasta" → 400', async () => {
  const { status, body } = await api(token, 'GET', `/abonos?desde=${hoy}&hasta=${masDias(hoy, -1)}`);
  assert.equal(status, 400);
  assert.equal(body.errors.desde, 'La fecha "desde" no puede ser posterior a "hasta"');
});

test('filtros inválidos → 400 con el error por campo', async () => {
  const fecha = await api(token, 'GET', '/abonos?desde=28-09-2026');
  assert.equal(fecha.status, 400);
  assert.ok(fecha.body.errors.desde);
  const idCliente = await api(token, 'GET', '/abonos?id_cliente=abc');
  assert.equal(idCliente.status, 400);
  assert.ok(idCliente.body.errors.id_cliente);
});
