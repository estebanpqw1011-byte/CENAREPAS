// Aplica las migraciones de Base_Datos/migraciones a la base LOCAL cenarepas_db.
//
// Las migraciones se bloquean fuera de cenarepas_staging. Este script quita ese
// bloque solo en memoria (los .sql no cambian) y únicamente si la conexión de
// Backend/.env apunta a cenarepas_db en este equipo. Staging sigue igual.
//
// Uso (desde Backend/):
//   npm run migrar:local                       → muestra el plan y no ejecuta nada
//   npm run migrar:local -- --confirmar        → ejecuta 001-011 en orden
//   npm run migrar:local -- --confirmar --desde=010  → retoma desde una migración
//
// Cada archivo trae su BEGIN/COMMIT: si uno falla, se revierte ese archivo y el
// script se detiene; los anteriores quedan aplicados. Haz un respaldo antes.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../src/config/env.js';

// 900 (usuarios de prueba de Staging) queda fuera a propósito.
const MIGRACIONES = [
  '001_seguridad_roles_permisos.sql',
  '002_pedidos_estados_fusion_ventas.sql',
  '003_rol_cliente_vinculo_usuario.sql',
  '004_creditos_abonos.sql',
  '005_notificaciones.sql',
  '006_categoria_imagen.sql',
  '007_ver_fichas_tecnicas_vendedor_secretaria.sql',
  '009_retirar_auditoria_acceso_fichas.sql',
  '010_pedido_estado_historial.sql',
  '011_recuperacion_intentos.sql',
];

const BASE_PERMITIDA = 'cenarepas_db';
const HOSTS_LOCALES = ['localhost', '127.0.0.1', '::1'];
const CANDADO = /DO \$\$\s*BEGIN\s*IF current_database\(\) <> 'cenarepas_staging' THEN[\s\S]*?END \$\$;/g;

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../Base_Datos/migraciones');
const confirmar = process.argv.includes('--confirmar');
const desdeArg = process.argv.find((a) => a.startsWith('--desde='));
const desde = desdeArg ? desdeArg.split('=')[1] : null;

const salir = (mensaje) => {
  console.error(`❌ ${mensaje}`);
  process.exit(1);
};

const { host, port, database, user } = config.db;
if (database !== BASE_PERMITIDA) salir(`La conexión apunta a "${database}"; este script solo migra ${BASE_PERMITIDA}.`);
if (!HOSTS_LOCALES.includes(host)) salir(`El host es "${host}"; este script solo migra una base local.`);

const pendientes = desde ? MIGRACIONES.filter((m) => m.slice(0, 3) >= desde) : MIGRACIONES;
if (pendientes.length === 0) salir(`--desde=${desde} no coincide con ninguna migración.`);

// Lee cada archivo y quita el candado; debe haber exactamente uno.
const plan = pendientes.map((archivo) => {
  const ruta = path.join(dir, archivo);
  if (!fs.existsSync(ruta)) salir(`No existe ${ruta}`);
  const original = fs.readFileSync(ruta, 'utf8').replace(/^﻿/, '');
  const candados = original.match(CANDADO) || [];
  if (candados.length !== 1) salir(`${archivo}: se esperaba un bloque de candado y hay ${candados.length}.`);
  return { archivo, sql: original.replace(CANDADO, '') };
});

console.log(`Destino: ${user}@${host}:${port}/${database}`);
console.log('Orden:');
plan.forEach(({ archivo }, i) => console.log(`  ${i + 1}. ${archivo}`));

if (!confirmar) {
  console.log('\nNo se ejecutó nada. Para aplicar: npm run migrar:local -- --confirmar');
  process.exit(0);
}

const client = new pg.Client({ host, port, user, password: config.db.password, database, ssl: config.db.ssl ? { rejectUnauthorized: false } : false });
await client.connect();
try {
  // Se comprueba en el servidor, no solo en la configuración.
  const { rows } = await client.query('SELECT current_database() AS db');
  if (rows[0].db !== BASE_PERMITIDA) salir(`El servidor respondió current_database() = "${rows[0].db}".`);

  for (const { archivo, sql } of plan) {
    process.stdout.write(`→ ${archivo} ... `);
    try {
      await client.query(sql);
      console.log('ok');
    } catch (error) {
      console.log('FALLÓ');
      await client.query('ROLLBACK').catch(() => {});
      salir(`${archivo}: ${error.message}. Se revirtió este archivo; las anteriores quedaron aplicadas. Corrige y retoma con --desde=${archivo.slice(0, 3)}.`);
    }
  }
  console.log(`✅ ${plan.length} migraciones aplicadas en ${database}.`);
} finally {
  await client.end();
}
