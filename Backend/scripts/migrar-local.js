// Aplica las migraciones de Base_Datos/migraciones a la base LOCAL cenarepas_db,
// en orden y sin repetir las que ya se aplicaron.
//
// Toma todos los archivos NNN_nombre.sql de la carpeta con NNN menor a 900
// (900 y siguientes son datos solo de Staging). Las ya aplicadas quedan
// registradas en cenarepas.schema_migrations; cada migración se registra en la
// misma transacción que la aplica, así que nunca queda aplicada sin registrar.
//
// Primera vez en una base sin schema_migrations: crea la tabla y reconoce las
// migraciones 001-012 que ya están aplicadas por lo que dejaron en la base
// (HUELLAS, abajo), sin volver a ejecutarlas. Las posteriores no necesitan
// huella: desde entonces las registra el script.
//
// Las migraciones se bloquean fuera de cenarepas_staging. Este script quita ese
// bloque solo en memoria (los .sql no cambian) y únicamente si la conexión de
// Backend/.env apunta a cenarepas_db en este equipo. Staging sigue igual.
//
// Uso (desde Backend/):
//   npm run migrar:local                  → muestra qué está aplicado y qué falta; no ejecuta nada
//   npm run migrar:local -- --confirmar   → aplica las pendientes en orden
//
// Si una falla, se revierte esa migración (y su registro) y el script se
// detiene; las anteriores quedan aplicadas y registradas. Haz un respaldo antes.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../src/config/env.js';

const BASE_PERMITIDA = 'cenarepas_db';
const HOSTS_LOCALES = ['localhost', '127.0.0.1', '::1'];
const CANDADO = /DO \$\$\s*BEGIN\s*IF current_database\(\) <> 'cenarepas_staging' THEN[\s\S]*?END \$\$;/g;
const ARCHIVO_MIGRACION = /^(\d{3})_[\w-]+\.sql$/;
const PRIMERA_SOLO_STAGING = 900;

/**
 * Huellas de las migraciones anteriores a schema_migrations: una consulta que
 * devuelve true si la migración ya está aplicada. Solo se usan la primera vez.
 * 001 y 007 solo insertan permisos (y se pueden repetir sin daño); 009 se da
 * por aplicada si la tabla que retira no existe.
 */
const HUELLAS = {
  '001': `SELECT EXISTS (SELECT 1 FROM rol_permiso rp JOIN rol r USING (id_rol) JOIN permiso p USING (id_permiso)
                         WHERE r.nombre = 'Secretaria' AND p.modulo = 'abonos')`,
  '002': `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'cenarepas'
                         AND table_name = 'pedido' AND column_name = 'stock_descontado')`,
  '003': `SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_cliente_usuario')`,
  '004': `SELECT to_regclass('cenarepas.credito') IS NOT NULL`,
  '005': `SELECT to_regclass('cenarepas.notificacion') IS NOT NULL`,
  '006': `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'cenarepas'
                         AND table_name = 'categoria_producto' AND column_name = 'imagen_url')`,
  '007': `SELECT EXISTS (SELECT 1 FROM rol_permiso rp JOIN rol r USING (id_rol) JOIN permiso p USING (id_permiso)
                         WHERE r.nombre = 'Vendedor' AND p.modulo = 'fichas-tecnicas' AND p.accion = 'ver')`,
  '009': `SELECT to_regclass('cenarepas.auditoria_acceso_fichas') IS NULL`,
  '010': `SELECT to_regclass('cenarepas.pedido_estado_historial') IS NOT NULL`,
  '011': `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'cenarepas'
                         AND table_name = 'usuario' AND column_name = 'recuperacion_intentos')`,
  '012': `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'cenarepas'
                         AND table_name = 'cliente' AND column_name = 'tipo_persona')`,
};

const CREAR_CONTROL = `
  CREATE TABLE IF NOT EXISTS cenarepas.schema_migrations (
    archivo     VARCHAR(255) PRIMARY KEY,
    aplicada_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    como        VARCHAR(10)  NOT NULL CHECK (como IN ('aplicada', 'detectada'))
  );
  COMMENT ON TABLE cenarepas.schema_migrations IS
    'Migraciones aplicadas por npm run migrar:local (detectada: ya estaba aplicada antes de existir esta tabla)';`;

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../Base_Datos/migraciones');
const confirmar = process.argv.includes('--confirmar');

const salir = (mensaje) => {
  console.error(`❌ ${mensaje}`);
  process.exit(1);
};
const literal = (texto) => `'${texto.replace(/'/g, "''")}'`;

// 1. Solo la base local cenarepas_db (Staging también está en localhost: lo frena el nombre).
const { host, port, database, user } = config.db;
if (database !== BASE_PERMITIDA) salir(`La conexión apunta a "${database}"; este script solo migra ${BASE_PERMITIDA}.`);
if (!HOSTS_LOCALES.includes(host)) salir(`El host es "${host}"; este script solo migra una base local.`);

// 2. Migraciones de la carpeta, en orden; cada una con un candado y terminada en COMMIT.
const migraciones = fs
  .readdirSync(dir)
  .filter((f) => ARCHIVO_MIGRACION.test(f) && Number(f.slice(0, 3)) < PRIMERA_SOLO_STAGING)
  .sort()
  .map((archivo) => {
    const original = fs.readFileSync(path.join(dir, archivo), 'utf8').replace(/^﻿/, '');
    const candados = original.match(CANDADO) || [];
    if (candados.length !== 1) salir(`${archivo}: se esperaba un bloque de candado y hay ${candados.length}.`);
    const sql = original.replace(CANDADO, '').trimEnd();
    if (!/COMMIT;$/i.test(sql)) salir(`${archivo}: debe terminar en COMMIT; (cada migración trae su BEGIN/COMMIT).`);
    // El registro va dentro de la transacción de la migración: o quedan las dos cosas, o ninguna.
    const registro = `INSERT INTO cenarepas.schema_migrations (archivo, como) VALUES (${literal(archivo)}, 'aplicada');`;
    return { archivo, numero: archivo.slice(0, 3), sql: sql.replace(/COMMIT;$/i, `${registro}\nCOMMIT;`) };
  });
const numeros = migraciones.map((m) => m.numero);
const repetido = numeros.find((n, i) => numeros.indexOf(n) !== i);
if (repetido) salir(`Hay dos migraciones con el número ${repetido}.`);

const client = new pg.Client({ host, port, user, password: config.db.password, database, ssl: config.db.ssl ? { rejectUnauthorized: false } : false });
await client.connect();
try {
  // 3. Se comprueba también en el servidor, no solo en la configuración.
  const { rows: [servidor] } = await client.query(
    `SELECT current_database() AS db, COALESCE(host(inet_server_addr()), 'socket local') AS ip`
  );
  if (servidor.db !== BASE_PERMITIDA) salir(`El servidor respondió current_database() = "${servidor.db}".`);
  if (!['socket local', '127.0.0.1', '::1'].includes(servidor.ip)) salir(`El servidor está en ${servidor.ip}; este script solo migra una base local.`);
  await client.query('SET search_path TO cenarepas');

  // 4. Qué está aplicado: la tabla de control o, la primera vez, las huellas.
  const hayControl = (await client.query(`SELECT to_regclass('cenarepas.schema_migrations') IS NOT NULL AS hay`)).rows[0].hay;
  let aplicadas;
  const detectadas = [];
  if (hayControl) {
    aplicadas = new Set((await client.query('SELECT archivo FROM schema_migrations')).rows.map((r) => r.archivo));
  } else {
    for (const m of migraciones) {
      if (!HUELLAS[m.numero]) continue;
      const { rows } = await client.query(`SELECT (${HUELLAS[m.numero]}) AS aplicada`);
      if (rows[0].aplicada) detectadas.push(m.archivo);
    }
    aplicadas = new Set(detectadas);
    // Un hueco (p. ej. la 004 aplicada sin la 003) es una base rara: mejor revisarla a mano.
    const ultima = migraciones.findLastIndex((m) => aplicadas.has(m.archivo));
    const hueco = migraciones.slice(0, ultima + 1).find((m) => !aplicadas.has(m.archivo));
    if (hueco) salir(`Las huellas muestran migraciones posteriores aplicadas pero no ${hueco.archivo}. Revisa la base a mano antes de seguir.`);
  }
  const pendientes = migraciones.filter((m) => !aplicadas.has(m.archivo));

  console.log(`Destino: ${user}@${host}:${port}/${database}`);
  console.log(hayControl ? 'Control: schema_migrations' : 'Control: no existe schema_migrations; se creará y se reconocen las ya aplicadas por sus huellas');
  for (const m of migraciones) {
    const estado = detectadas.includes(m.archivo) ? 'ya aplicada (detectada)' : aplicadas.has(m.archivo) ? 'ya aplicada' : 'PENDIENTE';
    console.log(`  ${m.archivo.padEnd(48)} ${estado}`);
  }

  if (!confirmar) {
    console.log(`\nNo se ejecutó nada. ${pendientes.length} pendiente(s).${pendientes.length || !hayControl ? ' Para aplicar: npm run migrar:local -- --confirmar' : ''}`);
    process.exit(0);
  }

  // 5. Primera vez: la tabla y las detectadas, en una sola transacción.
  if (!hayControl) {
    await client.query('BEGIN');
    await client.query(CREAR_CONTROL);
    for (const archivo of detectadas) {
      await client.query(`INSERT INTO schema_migrations (archivo, como) VALUES ($1, 'detectada')`, [archivo]);
    }
    await client.query('COMMIT');
    console.log(`→ schema_migrations creada; ${detectadas.length} migraciones registradas como detectadas.`);
  }

  for (const { archivo, sql } of pendientes) {
    process.stdout.write(`→ ${archivo} ... `);
    try {
      await client.query(sql);
      console.log('ok');
    } catch (error) {
      console.log('FALLÓ');
      await client.query('ROLLBACK').catch(() => {});
      salir(`${archivo}: ${error.message}. Se revirtió esta migración; las anteriores quedaron aplicadas. Corrige y vuelve a ejecutar.`);
    }
  }
  console.log(pendientes.length ? `✅ ${pendientes.length} migración(es) aplicada(s) en ${database}.` : '✅ La base ya está al día.');
} finally {
  await client.end();
}
