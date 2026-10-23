// POST y DELETE /uploads/imagen: validaciones (tipo, tamaño, carpeta), permisos
// por carpeta y el 409 de una imagen en uso. Corre contra el backend de Staging
// en marcha (npm run test:staging). Sin credenciales de Cloudinary las
// imágenes van al disco del servidor; con ellas, a Cloudinary. Todo lo que
// sube lo elimina al final.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, api, login, unico } from './helpers/api.js';

// PNG real de 1x1 (firma válida).
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

let admin;
let vendedor;
const subidas = [];
let categoria;

async function subir(token, { buffer = PNG, tipo = 'image/png', nombre = 'prueba.png', carpeta = 'productos' } = {}) {
  const form = new FormData();
  form.append('carpeta', carpeta);
  form.append('imagen', new Blob([buffer], { type: tipo }), nombre);
  const res = await fetch(`${BASE}/uploads/imagen`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = await res.json();
  if (res.status === 201) subidas.push(body.data.public_id);
  return { status: res.status, body };
}

before(async () => {
  admin = await login('admin@staging.test');
  vendedor = await login('vendedor@staging.test');
});

after(async () => {
  if (categoria) await api(admin, 'DELETE', `/categorias/${categoria.id_categoria}/definitivo`);
  for (const publicId of subidas) await api(admin, 'DELETE', '/uploads/imagen', { public_id: publicId });
});

test('validaciones: tipo, contenido, tamaño, carpeta y sesión', async () => {
  const gif = await subir(admin, { buffer: Buffer.from('GIF89a'), tipo: 'image/gif', nombre: 'a.gif' });
  assert.equal(gif.status, 400, JSON.stringify(gif.body));

  const pdf = await subir(admin, { buffer: Buffer.from('%PDF-1.4\n'), tipo: 'application/pdf', nombre: 'a.pdf' });
  assert.equal(pdf.status, 400, 'un PDF no es una imagen');

  const disfrazado = await subir(admin, { buffer: Buffer.from('hola, no soy una imagen'), nombre: 'falso.png' });
  assert.equal(disfrazado.status, 400, 'texto con extensión .png');

  const grande = await subir(admin, { buffer: Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]), nombre: 'grande.png' });
  assert.equal(grande.status, 400);
  assert.match(grande.body.message, /5 MB/);

  const carpeta = await subir(admin, { carpeta: 'usuarios' });
  assert.equal(carpeta.status, 400, 'la carpeta usuarios no está habilitada');

  const sinSesion = await subir(null);
  assert.equal(sinSesion.status, 401);

  const sinPermiso = await subir(vendedor);
  assert.equal(sinPermiso.status, 403);
});

test('sube, protege la imagen en uso (409) y la elimina', async () => {
  const subida = await subir(admin, { carpeta: 'categorias' });
  assert.equal(subida.status, 201, JSON.stringify(subida.body));
  const { url, public_id: publicId, carpeta } = subida.body.data;
  assert.ok(url && publicId, 'devuelve url y public_id');
  assert.equal(carpeta, 'categorias');

  // Una categoría la guarda: no se puede eliminar por este endpoint.
  const creada = await api(admin, 'POST', '/categorias', {
    nombre: `PRUEBA - Categoría con imagen ${unico()}`,
    imagen_url: url,
    imagen_public_id: publicId,
  });
  assert.equal(creada.status, 201, JSON.stringify(creada.body));
  categoria = creada.body.data;
  const enUso = await api(admin, 'DELETE', '/uploads/imagen', { public_id: publicId });
  assert.equal(enUso.status, 409);

  // Sin el registro, se elimina; una segunda vez ya no existe.
  await api(admin, 'PUT', `/categorias/${categoria.id_categoria}`, { quitar_imagen: true });
  const otra = await subir(admin, { carpeta: 'categorias' });
  assert.equal(otra.status, 201);
  const sinPermiso = await api(vendedor, 'DELETE', '/uploads/imagen', { public_id: otra.body.data.public_id });
  assert.equal(sinPermiso.status, 403);
  const borrada = await api(admin, 'DELETE', '/uploads/imagen', { public_id: otra.body.data.public_id });
  assert.equal(borrada.status, 200, JSON.stringify(borrada.body));
  const deNuevo = await api(admin, 'DELETE', '/uploads/imagen', { public_id: otra.body.data.public_id });
  assert.equal(deNuevo.status, 404);

  const invalido = await api(admin, 'DELETE', '/uploads/imagen', { public_id: 'local:compras/../../.env' });
  assert.equal(invalido.status, 400);
});
