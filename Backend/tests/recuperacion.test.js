// f) Recuperación de contraseña con código de 6 dígitos (HU-003, HU-004).
//
// Corre con el backend de Staging en marcha (npm run dev:staging):
//   npm run test:staging
//
// Cómo obtiene el código sin exponerlo en la API: las pruebas usan el
// servicio en este mismo proceso, con CORREO_PROVEEDOR=consola, y leen el
// último correo de CorreoService.ultimo. Nunca hay un endpoint de pruebas.
// Las comprobaciones de rutas y de login van por HTTP al servidor.
//
// Datos: el usuario "PRUEBA - Recuperación de contraseña"
// (prueba.recuperacion@staging.test, rol Vendedor). Se crea la primera vez
// (por la API, como administrador) y se reutiliza; cada corrida le cambia la
// contraseña.

import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

process.env.ENV_FILE = '.env.staging';
process.env.CORREO_PROVEEDOR = 'consola';

const BASE = process.env.API_URL || 'http://localhost:4000/api/v1';
const CORREO = 'prueba.recuperacion@staging.test';

const { RecuperacionService } = await import('../src/services/recuperacion.service.js');
const { config } = await import('../src/config/env.js');
const { CorreoService } = await import('../src/services/correo.service.js');
const { pool, query } = await import('../src/config/db.js');
const bcrypt = (await import('bcryptjs')).default;

async function http(metodo, ruta, cuerpo, token) {
  const res = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  return { status: res.status, body: await res.json() };
}

/** Pide un código y lo lee del correo "enviado" (modo consola). */
async function pedirCodigo() {
  CorreoService.ultimo = null;
  await RecuperacionService.solicitar(CORREO);
  await new Promise((r) => setTimeout(r, 50)); // el envío no se espera
  const codigo = CorreoService.ultimo?.texto.match(/\b(\d{6})\b/)?.[1];
  assert.ok(codigo, 'no llegó el correo con el código');
  return codigo;
}

/** Espera el error 400/429 del servicio y devuelve su mensaje y campos. */
async function falla(promesa, status = 400) {
  const err = await promesa.then(() => null, (e) => e);
  assert.ok(err, 'debía fallar');
  assert.equal(err.statusCode ?? err.status, status);
  return err;
}

const otroCodigo = (c) => String((Number(c) + 1) % 1_000_000).padStart(6, '0');

let admin;

before(async () => {
  admin = (await http('POST', '/auth/login', { correo: 'admin@staging.test', contrasena: 'Staging123*' })).body.data.token;
  const existe = await query('SELECT 1 FROM usuario WHERE LOWER(correo) = $1', [CORREO]);
  if (existe.rows.length === 0) {
    const roles = (await http('GET', '/roles', undefined, admin)).body.data;
    const vendedor = roles.find((r) => r.nombre === 'Vendedor');
    const creado = await http('POST', '/usuarios', {
      nombre: 'PRUEBA - Recuperación de contraseña',
      correo: CORREO,
      contrasena: 'Inicial123*',
      id_rol: vendedor.id_rol,
      estado: 'Activo',
    }, admin);
    assert.equal(creado.status, 201, JSON.stringify(creado.body));
  }
});

beforeEach(() => RecuperacionService.limpiarLimite());

after(async () => {
  await pool.end();
});

test('correo inexistente: la misma respuesta que uno existente (y no genera código)', async () => {
  const inexistente = `no.existe.${Date.now()}@staging.test`;
  const a = await RecuperacionService.solicitar(CORREO);
  const b = await RecuperacionService.solicitar(inexistente);
  assert.deepEqual(a, b);
  const res = await query('SELECT count(*)::int AS n FROM usuario WHERE LOWER(correo) = $1', [inexistente]);
  assert.equal(res.rows[0].n, 0);

  // Por la API también (correo nuevo en cada corrida: no choca con el límite).
  const api = await http('POST', '/auth/recuperar', { correo: `no.existe.api.${Date.now()}@staging.test` });
  assert.equal(api.status, 200);
  assert.equal(api.body.data.mensaje, a.mensaje);
});

test('límite: una solicitud por minuto por correo (exista o no)', async () => {
  await RecuperacionService.solicitar(CORREO);
  const err = await falla(RecuperacionService.solicitar(CORREO), 429);
  assert.match(err.message, /^Ya pediste un código\. Espera \d+ segundos para pedir otro\.$/);

  const inexistente = `no.existe.limite.${Date.now()}@staging.test`;
  await RecuperacionService.solicitar(inexistente);
  await falla(RecuperacionService.solicitar(inexistente), 429);
});

test('código vencido → no es válido', async () => {
  const codigo = await pedirCodigo();
  await query(`UPDATE usuario SET token_expiracion = LOCALTIMESTAMP - interval '1 minute' WHERE LOWER(correo) = $1`, [CORREO]);
  const err = await falla(RecuperacionService.verificar(CORREO, codigo));
  assert.equal(err.details.codigo, 'El código no es válido o ya venció. Solicita uno nuevo.');
});

test('código incorrecto → cuenta el intento y dice cuántos quedan', async () => {
  const codigo = await pedirCodigo();
  const err = await falla(RecuperacionService.verificar(CORREO, otroCodigo(codigo)));
  assert.equal(err.details.codigo, 'Código incorrecto. Te quedan 4 intentos.');
  // El correcto sigue sirviendo.
  assert.deepEqual(await RecuperacionService.verificar(CORREO, codigo), { valido: true });
});

test('bloqueo al 5.º intento: el código se invalida aunque después se escriba bien', async () => {
  const codigo = await pedirCodigo();
  const malo = otroCodigo(codigo);
  for (const quedan of [4, 3, 2]) {
    const err = await falla(RecuperacionService.verificar(CORREO, malo));
    assert.equal(err.details.codigo, `Código incorrecto. Te quedan ${quedan} intentos.`);
  }
  assert.equal((await falla(RecuperacionService.verificar(CORREO, malo))).details.codigo, 'Código incorrecto. Te queda 1 intento.');
  assert.equal(
    (await falla(RecuperacionService.verificar(CORREO, malo))).details.codigo,
    'Superaste los 5 intentos. Solicita un código nuevo.'
  );
  assert.equal(
    (await falla(RecuperacionService.verificar(CORREO, codigo))).details.codigo,
    'El código no es válido o ya venció. Solicita uno nuevo.'
  );
});

test('contraseña que no cumple el mínimo → 400 en su campo, sin gastar intentos', async () => {
  const codigo = await pedirCodigo();
  const err = await falla(RecuperacionService.restablecer(CORREO, codigo, 'Corta1*', 'Corta1*'));
  assert.equal(err.details.contrasena, 'La contraseña debe tener al menos 8 caracteres');
  const intentos = await query('SELECT recuperacion_intentos FROM usuario WHERE LOWER(correo) = $1', [CORREO]);
  assert.equal(intentos.rows[0].recuperacion_intentos, 0);
});

test('contraseñas que no coinciden → 400 en confirmacion', async () => {
  const codigo = await pedirCodigo();
  const err = await falla(RecuperacionService.restablecer(CORREO, codigo, 'Nueva1234*', 'Nueva1234+'));
  assert.equal(err.details.confirmacion, 'Las contraseñas no coinciden');
});

test('cambio exitoso: el login funciona con la nueva y el código no se puede reutilizar', async () => {
  const nueva = `Nueva${Date.now() % 100000}*`;
  const codigo = await pedirCodigo();

  // Por la API, como lo harán la app y la web.
  const cambio = await http('POST', '/auth/restablecer', { correo: CORREO, codigo, contrasena: nueva, confirmacion: nueva });
  assert.equal(cambio.status, 200, JSON.stringify(cambio.body));
  assert.equal((await http('POST', '/auth/login', { correo: CORREO, contrasena: nueva })).status, 200);

  const reuso = await http('POST', '/auth/restablecer', { correo: CORREO, codigo, contrasena: 'Otra12345*', confirmacion: 'Otra12345*' });
  assert.equal(reuso.status, 400);
  assert.equal(reuso.body.errors.codigo, 'El código no es válido o ya venció. Solicita uno nuevo.');
  assert.equal((await http('POST', '/auth/login', { correo: CORREO, contrasena: nueva })).status, 200);
});

test('el mínimo de 8 no afecta el login con contraseñas existentes de 6 o 7 caracteres', async () => {
  for (const antigua of ['Seis66', 'Siete77']) {
    await query('UPDATE usuario SET contrasena_hash = $1 WHERE LOWER(correo) = $2', [await bcrypt.hash(antigua, 10), CORREO]);
    const login = await http('POST', '/auth/login', { correo: CORREO, contrasena: antigua });
    assert.equal(login.status, 200, `login con ${antigua.length} caracteres`);
  }
});

test('si Brevo falla: queda en el log con el correo enmascarado y sin el código', async () => {
  const anterior = { ...config.correo };
  const errores = [];
  const original = console.error;
  console.error = (...args) => errores.push(args.join(' '));
  try {
    // Brevo sin clave: el envío falla (sin llamar a Internet).
    Object.assign(config.correo, { proveedor: 'brevo', brevoApiKey: '', remitente: 'x@y.co' });
    const respuesta = await RecuperacionService.solicitar(CORREO);
    await new Promise((r) => setTimeout(r, 50));
    // El usuario recibe la misma respuesta de siempre.
    assert.equal(respuesta.mensaje, 'Si el correo está registrado, te enviamos un código de 6 dígitos. Revisa también la carpeta de spam.');
  } finally {
    console.error = original;
    Object.assign(config.correo, anterior);
  }
  const linea = errores.find((e) => e.startsWith('[Recuperacion]'));
  assert.ok(linea, 'el error debe quedar en el log');
  assert.equal(linea, '[Recuperacion] No se pudo enviar el código a p***@staging.test: Faltan BREVO_API_KEY o CORREO_REMITENTE');
  assert.ok(!linea.includes(CORREO), 'no debe tener el correo completo');
  assert.ok(!/\b\d{6}\b/.test(linea), 'no debe tener el código');
});

test('el personal nuevo o con contraseña cambiada exige 8 caracteres', async () => {
  const roles = (await http('GET', '/roles', undefined, admin)).body.data;
  const creado = await http('POST', '/usuarios', {
    nombre: 'PRUEBA - no se crea',
    correo: `no.se.crea.${Date.now()}@staging.test`,
    contrasena: 'Siete77',
    id_rol: roles.find((r) => r.nombre === 'Vendedor').id_rol,
  }, admin);
  assert.equal(creado.status, 400);
  assert.equal(creado.body.message, 'La contraseña debe tener al menos 8 caracteres');
});
