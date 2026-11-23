// PUT /abonos/:id: editar un abono solo mientras está En revisión.
//
// Corre contra el backend de Staging en marcha (npm run dev:staging):
//   npm run test:staging
// Datos que usa:
//   - Un usuario Cliente fijo (prueba.abonos@staging.test, cliente "PRUEBA - …",
//     documento 9000000003). Se registra la primera vez.
//   - Un pedido FIJO de ese cliente (observaciones "PRUEBA - pedido fijo de la
//     edición de abonos") con su abono inicial En revisión, que es el que se
//     edita en cada corrida. Si ya no sirve (pedido anulado, crédito no Activo
//     o sin abono En revisión), se crea otro y se avisa en el log.
//   - Para los 409 registra un abono de $1 del personal (Aprobado), que luego
//     anula, y uno de $1 del cliente, que rechaza: el saldo queda como estaba.
//   - Sube un PNG mínimo con POST /comprobantes para probar un comprobante válido.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.API_URL || 'http://localhost:4000/api/v1';
const CLAVE = 'Staging123*';
const CORREO_CLIENTE = 'prueba.abonos@staging.test';
const OBS_FIJO = 'PRUEBA - pedido fijo de la edición de abonos';
const DIAS_MAX = 7; // ABONO_DIAS_ATRAS_MAX en src/config/negocio.js

async function api(token, metodo, ruta, cuerpo) {
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { status: res.status, body: await res.json() };
}

async function login(correo) {
  const res = await api(null, 'POST', '/auth/login', { correo, contrasena: CLAVE });
  return res.status === 200 ? res.body.data.token : null;
}

const dia = (valor) => new Date(valor).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const hoy = dia(Date.now());
const masDias = (fecha, n) => {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

let secretaria;
let vendedor;
let cliente;
let pedido;
let abono; // el abono En revisión que se edita
let aprobado; // abono del personal para el 409

/** Abono En revisión del pedido fijo, o null si el pedido ya no sirve. */
async function abonoEnRevision(p) {
  if (p.estado === 'Anulado' || p.credito_estado !== 'Activo') return null;
  const { body } = await api(secretaria, 'GET', `/abonos?id_pedido=${p.id_pedido}&estado=${encodeURIComponent('En revisión')}`);
  return body.data[0] ?? null;
}

before(async () => {
  secretaria = await login('secretaria@staging.test');
  vendedor = await login('vendedor@staging.test');
  assert.ok(secretaria && vendedor, 'login del personal');

  cliente = await login(CORREO_CLIENTE);
  if (!cliente) {
    const registro = await api(null, 'POST', '/auth/register', {
      nombre: 'PRUEBA - Cliente de la edición de abonos',
      tipo_documento: 'CC',
      documento: '9000000003',
      telefono: '3000000003',
      correo: CORREO_CLIENTE,
      municipio: 'Medellín',
      barrio: 'Centro',
      direccion: 'Calle 1 # 2-3',
      contrasena: CLAVE,
    });
    assert.equal(registro.status, 201, JSON.stringify(registro.body));
    cliente = await login(CORREO_CLIENTE);
  }

  const pedidos = (await api(secretaria, 'GET', '/pedidos')).body.data.filter((p) => p.observaciones === OBS_FIJO);
  for (const p of pedidos) {
    abono = await abonoEnRevision(p);
    if (abono) { pedido = p; break; }
  }
  if (!abono) {
    const producto = (await api(secretaria, 'GET', '/productos')).body.data
      .filter((p) => p.estado === 'Activo' && Number(p.stock_actual) >= 1 && Number(p.precio_venta) >= 1000)
      .filter((p) => !p.fecha_vencimiento || dia(p.fecha_vencimiento) >= hoy)[0];
    assert.ok(producto, 'hace falta un producto activo, con stock y sin vencer');
    const creado = await api(cliente, 'POST', '/mi/pedidos', {
      fecha_entrega: masDias(hoy, 2),
      medio_pago: 'Efectivo',
      valor_abono: 1,
      municipio: 'Medellín',
      barrio: 'Centro',
      direccion: 'Calle 1 # 2-3',
      observaciones: OBS_FIJO,
      detalles: [{ id_producto: producto.id_producto, cantidad: 1 }],
    });
    assert.equal(creado.status, 201, JSON.stringify(creado.body));
    pedido = (await api(secretaria, 'GET', `/pedidos/${creado.body.data.id_pedido}`)).body.data;
    abono = await abonoEnRevision(pedido);
    assert.ok(abono, 'el pedido nuevo debe tener su abono inicial En revisión');
    console.log(
      pedidos.length > 0
        ? `[abonos] Ningún pedido fijo de la edición servía: se creó el #${pedido.id_pedido}.`
        : `[abonos] Se creó el pedido fijo de la edición #${pedido.id_pedido}.`
    );
  }
});

after(async () => {
  // Deja el abono del personal anulado: el saldo vuelve a como estaba.
  if (aprobado) await api(secretaria, 'PATCH', `/abonos/${aprobado.id_abono}/anular`, { motivo: 'PRUEBA - limpieza' });
});

test('sin abonos:editar (Vendedor) → 403', async () => {
  const { status } = await api(vendedor, 'PUT', `/abonos/${abono.id_abono}`, { valor_abonado: 1 });
  assert.equal(status, 403);
});

test('En revisión: corrige valor, medio y fecha; lo que no se envía se conserva', async () => {
  const valor = Number(abono.valor_abonado) === 1 ? 2 : 1;
  const { status, body } = await api(secretaria, 'PUT', `/abonos/${abono.id_abono}`, {
    valor_abonado: valor,
    medio_pago: 'tarjeta',
    fecha_abono: hoy,
  });
  assert.equal(status, 200, JSON.stringify(body));
  assert.equal(Number(body.data.valor_abonado), valor);
  assert.equal(body.data.medio_pago, 'Tarjeta');
  assert.equal(dia(body.data.fecha_abono), hoy);
  assert.equal(body.data.estado, 'En revisión');
  assert.equal(body.data.comprobante_url, abono.comprobante_url);

  const soloMedio = await api(secretaria, 'PUT', `/abonos/${abono.id_abono}`, { medio_pago: 'Efectivo' });
  assert.equal(soloMedio.status, 200);
  assert.equal(Number(soloMedio.body.data.valor_abonado), valor);
  assert.equal(soloMedio.body.data.medio_pago, 'Efectivo');
});

test('transferencia sin comprobante → 400 en comprobante_url', async () => {
  const { status, body } = await api(secretaria, 'PUT', `/abonos/${abono.id_abono}`, { medio_pago: 'Transferencia' });
  assert.equal(status, 400);
  assert.equal(body.errors.comprobante_url, 'Para pagos por transferencia debes adjuntar el comprobante');
});

test('valor mayor que el saldo disponible → 400 en valor_abonado', async () => {
  const valor = Number(pedido.valor_total) * 10;
  const { status, body } = await api(secretaria, 'PUT', `/abonos/${abono.id_abono}`, { valor_abonado: valor });
  assert.equal(status, 400);
  assert.match(body.errors.valor_abonado, /^El abono no puede superar el saldo pendiente/);
});

test('valor 0 o no entero → 400', async () => {
  assert.equal((await api(secretaria, 'PUT', `/abonos/${abono.id_abono}`, { valor_abonado: 0 })).status, 400);
  assert.equal((await api(secretaria, 'PUT', `/abonos/${abono.id_abono}`, { valor_abonado: 1.5 })).status, 400);
});

test('fecha: futura, anterior al pedido o de hace más de 7 días → 400 en fecha_abono', async () => {
  const futura = await api(secretaria, 'PUT', `/abonos/${abono.id_abono}`, { fecha_abono: masDias(hoy, 1) });
  assert.equal(futura.status, 400);
  assert.equal(futura.body.errors.fecha_abono, 'La fecha del abono no puede ser futura');

  const antes = await api(secretaria, 'PUT', `/abonos/${abono.id_abono}`, {
    fecha_abono: masDias(dia(pedido.fecha_pedido), -1),
  });
  assert.equal(antes.status, 400);
  assert.ok(antes.body.errors.fecha_abono);

  const vieja = await api(secretaria, 'PUT', `/abonos/${abono.id_abono}`, { fecha_abono: masDias(hoy, -(DIAS_MAX + 1)) });
  assert.equal(vieja.status, 400);
  assert.ok(vieja.body.errors.fecha_abono);
});

test('Aprobado, Rechazado o Anulado → 409 con el mensaje de cada estado', async () => {
  const creado = await api(secretaria, 'POST', '/abonos', {
    id_pedido: pedido.id_pedido, valor_abonado: 1, medio_pago: 'Efectivo',
  });
  assert.equal(creado.status, 201, JSON.stringify(creado.body));
  aprobado = creado.body.data;
  assert.equal(aprobado.estado, 'Aprobado');

  const editarAprobado = await api(secretaria, 'PUT', `/abonos/${aprobado.id_abono}`, { valor_abonado: 2 });
  assert.equal(editarAprobado.status, 409);
  assert.equal(editarAprobado.body.message, 'El abono ya fue aprobado; anúlalo y registra uno nuevo.');

  const anulado = await api(secretaria, 'PATCH', `/abonos/${aprobado.id_abono}/anular`, { motivo: 'PRUEBA - limpieza' });
  assert.equal(anulado.status, 200);
  const editarAnulado = await api(secretaria, 'PUT', `/abonos/${aprobado.id_abono}`, { valor_abonado: 2 });
  assert.equal(editarAnulado.status, 409);
  assert.equal(editarAnulado.body.message, 'El abono está anulado y no se puede editar; registra uno nuevo.');
  aprobado = null; // ya quedó anulado

  const delCliente = await api(cliente, 'POST', `/mi/creditos/${pedido.id_credito}/abonos`, {
    valor_abonado: 1, medio_pago: 'Efectivo',
  });
  assert.equal(delCliente.status, 201, JSON.stringify(delCliente.body));
  const rechazado = await api(secretaria, 'PATCH', `/abonos/${delCliente.body.data.id_abono}/rechazar`, {
    motivo: 'PRUEBA - rechazo de la prueba de edición',
  });
  assert.equal(rechazado.status, 200);
  const editarRechazado = await api(secretaria, 'PUT', `/abonos/${delCliente.body.data.id_abono}`, { valor_abonado: 2 });
  assert.equal(editarRechazado.status, 409);
  assert.equal(editarRechazado.body.message, 'El abono fue rechazado y no se puede editar; registra uno nuevo.');
});

const COMPROBANTE_EXTERNO = 'https://comprobantes.ejemplo.com/vouchers/voucher-001.pdf';

test('POST /abonos: comprobante externo u otra ruta → 400 en comprobante_url y no crea', async () => {
  const antes = (await api(secretaria, 'GET', `/abonos?id_pedido=${pedido.id_pedido}`)).body.data.length;
  for (const url of [COMPROBANTE_EXTERNO, '/uploads/productos/u1_1_000000000000000000000000.png']) {
    const { status, body } = await api(secretaria, 'POST', '/abonos', {
      id_pedido: pedido.id_pedido, valor_abonado: 1, medio_pago: 'Transferencia', comprobante_url: url,
    });
    assert.equal(status, 400, url);
    assert.ok(body.errors.comprobante_url, url);
  }
  assert.equal((await api(secretaria, 'GET', `/abonos?id_pedido=${pedido.id_pedido}`)).body.data.length, antes);
});

test('PUT /abonos/:id: comprobante externo → 400; el de POST /comprobantes → 200', async () => {
  const externo = await api(secretaria, 'PUT', `/abonos/${abono.id_abono}`, {
    medio_pago: 'Transferencia', comprobante_url: COMPROBANTE_EXTERNO,
  });
  assert.equal(externo.status, 400);
  assert.ok(externo.body.errors.comprobante_url);

  // PNG mínimo: basta con la firma del archivo.
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const form = new FormData();
  form.append('comprobante', new Blob([png], { type: 'image/png' }), 'prueba.png');
  const subida = await fetch(`${BASE}/comprobantes`, {
    method: 'POST', headers: { Authorization: `Bearer ${secretaria}` }, body: form,
  });
  const url = (await subida.json()).data.url;
  assert.equal(subida.status, 201);

  const valido = await api(secretaria, 'PUT', `/abonos/${abono.id_abono}`, {
    medio_pago: 'Transferencia', comprobante_url: url,
  });
  assert.equal(valido.status, 200, JSON.stringify(valido.body));
  assert.equal(valido.body.data.comprobante_url, url);

  // Deja el abono como estaba: en efectivo y sin comprobante.
  const restaurado = await api(secretaria, 'PUT', `/abonos/${abono.id_abono}`, { medio_pago: 'Efectivo', comprobante_url: null });
  assert.equal(restaurado.status, 200);
  assert.equal(restaurado.body.data.comprobante_url, null);
});

test('abono que no existe → 404', async () => {
  const { status } = await api(secretaria, 'PUT', '/abonos/999999999', { valor_abonado: 1 });
  assert.equal(status, 404);
});
