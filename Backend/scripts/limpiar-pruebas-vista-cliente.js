// Borra de cenarepas_staging los datos de prueba de la vista del cliente en la
// web (rama feat/vista-cliente-web, 2026-10-16). Ver HANDOFF.md de la app,
// "Registro de datos de prueba".
//
// Uso (desde Backend/):
//   ENV_FILE=.env.staging node scripts/limpiar-pruebas-vista-cliente.js
//       → solo verifica (transacción de solo lectura): no borra nada
//   ENV_FILE=.env.staging node scripts/limpiar-pruebas-vista-cliente.js --confirmar
//       → borra todo en UNA transacción y después los archivos de comprobantes
//
// Seguridad: solo corre en cenarepas_staging (configuración y servidor). Los
// datos se buscan por dueño (usuarios 67 y 68) y deben coincidir EXACTAMENTE
// con los ids esperados; si aparece algo más, o si otra fila de la base apunta
// a lo que se va a borrar, no borra nada (ROLLBACK).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../src/config/env.js';

const BASE = 'cenarepas_staging';
const USUARIOS = [67, 68];

const ESPERADO = {
  cliente: [58, 62],
  pedido: [51, 52, 53],
  detalle_pedido: [55, 56, 57, 58],
  credito: [6, 7],
  abono: [78, 79, 84, 85],
  notificacion: [30, 31, 32, 34],
  pedido_estado_historial: [97, 98, 99, 104],
  usuario: USUARIOS,
};

// Orden de borrado: de las tablas que apuntan a las apuntadas.
const ORDEN = ['notificacion', 'pedido_estado_historial', 'abono', 'credito', 'detalle_pedido', 'pedido', 'cliente', 'usuario'];

const DIR_COMPROBANTES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../comprobantes');
const ARCHIVOS = [
  'u67_1792177519703_737f8c85af23907f22188a0b.png', // pedido 52 y abonos 78 y 85
  'u68_1792177519877_301ec98826b943a6e927f11d.png', // prueba del comprobante ajeno
];

const confirmar = process.argv.includes('--confirmar');
const salir = (mensaje) => {
  console.error(`❌ ${mensaje}`);
  process.exit(1);
};
const iguales = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

if (config.db.database !== BASE) salir(`La configuración apunta a "${config.db.database}": usa ENV_FILE=.env.staging.`);

// Archivos: deben estar exactamente los esperados de los usuarios 67 y 68.
const enDisco = fs.existsSync(DIR_COMPROBANTES)
  ? fs.readdirSync(DIR_COMPROBANTES).filter((f) => /^u(67|68)_/.test(f)).sort()
  : [];
if (!iguales(enDisco, [...ARCHIVOS].sort())) {
  salir(`Comprobantes de los usuarios 67 y 68 distintos de lo esperado: ${JSON.stringify(enDisco)}`);
}

const client = new pg.Client({
  host: config.db.host, port: config.db.port, user: config.db.user, password: config.db.password,
  database: config.db.database, ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  options: `-c search_path=${config.db.schema},public`,
});
await client.connect();

try {
  const db = (await client.query('SELECT current_database() AS db')).rows[0].db;
  if (db !== BASE) throw new Error(`El servidor respondió current_database() = "${db}"`);

  await client.query(confirmar ? 'BEGIN' : 'BEGIN TRANSACTION READ ONLY');
  const ids = async (sql, params) => (await client.query(sql, params)).rows.map((r) => Number(Object.values(r)[0]));

  // 1) Lo que existe hoy, buscado por dueño, debe ser exactamente lo esperado.
  const clientes = await ids('SELECT id_cliente FROM cliente WHERE id_usuario = ANY($1) ORDER BY 1', [USUARIOS]);
  const pedidos = await ids('SELECT id_pedido FROM pedido WHERE id_cliente = ANY($1) OR id_usuario = ANY($2) ORDER BY 1', [clientes, USUARIOS]);
  const actual = {
    cliente: clientes,
    pedido: pedidos,
    detalle_pedido: await ids('SELECT id_detalle_pedido FROM detalle_pedido WHERE id_pedido = ANY($1) ORDER BY 1', [pedidos]),
    credito: await ids('SELECT id_credito FROM credito WHERE id_cliente = ANY($1) OR id_pedido = ANY($2) ORDER BY 1', [clientes, pedidos]),
    abono: await ids(
      `SELECT id_abono FROM abono WHERE id_cliente = ANY($1) OR id_pedido = ANY($2)
         OR id_usuario_registra = ANY($3) OR id_usuario_revisa = ANY($3) ORDER BY 1`,
      [clientes, pedidos, USUARIOS]
    ),
    notificacion: await ids('SELECT id_notificacion FROM notificacion WHERE id_usuario = ANY($1) OR id_pedido = ANY($2) ORDER BY 1', [USUARIOS, pedidos]),
    pedido_estado_historial: await ids('SELECT id_historial FROM pedido_estado_historial WHERE id_pedido = ANY($1) OR id_usuario = ANY($2) ORDER BY 1', [pedidos, USUARIOS]),
    usuario: await ids('SELECT id_usuario FROM usuario WHERE id_usuario = ANY($1) ORDER BY 1', [USUARIOS]),
  };
  const distintos = Object.keys(ESPERADO).filter((t) => !iguales(actual[t], ESPERADO[t]));
  if (distintos.length > 0) {
    throw new Error(`Los datos no cuadran con lo esperado: ${distintos.map((t) => `${t} esperado ${JSON.stringify(ESPERADO[t])}, hay ${JSON.stringify(actual[t])}`).join('; ')}`);
  }

  // 2) Ninguna otra fila de la base puede apuntar a lo que se va a borrar.
  const fks = (await client.query(`
    SELECT c.conrelid::regclass::text AS tabla, a.attname AS columna, c.confrelid::regclass::text AS referida,
           (SELECT pa.attname FROM pg_index i JOIN pg_attribute pa ON pa.attrelid = i.indrelid AND pa.attnum = i.indkey[0]
             WHERE i.indrelid = c.conrelid AND i.indisprimary) AS pk
    FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE c.contype = 'f' AND c.confrelid = ANY(ARRAY['usuario','cliente','pedido','credito','abono']::regclass[])`)).rows;
  const sinEsquema = (t) => t.replace(/^cenarepas\./, '');
  const ajenas = [];
  for (const fk of fks) {
    const propias = ESPERADO[sinEsquema(fk.tabla)] || [];
    const res = await client.query(
      `SELECT count(*)::int AS n FROM ${fk.tabla} WHERE ${fk.columna} = ANY($1) AND NOT (${fk.pk} = ANY($2))`,
      [ESPERADO[sinEsquema(fk.referida)], propias]
    );
    if (res.rows[0].n > 0) ajenas.push(`${sinEsquema(fk.tabla)}.${fk.columna} → ${sinEsquema(fk.referida)}: ${res.rows[0].n}`);
  }
  if (ajenas.length > 0) throw new Error(`Hay filas ajenas que apuntan a los datos de prueba: ${ajenas.join('; ')}`);

  console.log(`Base: ${BASE}. Se borrarían:`);
  for (const t of ORDEN) console.log(`  ${t.padEnd(24)} ${JSON.stringify(ESPERADO[t])}`);
  console.log(`  archivos                 ${ARCHIVOS.join(', ')}`);

  if (!confirmar) {
    await client.query('ROLLBACK');
    console.log('\n✅ Verificación correcta. No se borró nada. Para borrar: agrega --confirmar');
  } else {
    // 3) Borrado en una transacción: cada tabla debe borrar exactamente lo esperado.
    const pkDe = { notificacion: 'id_notificacion', pedido_estado_historial: 'id_historial', abono: 'id_abono', credito: 'id_credito', detalle_pedido: 'id_detalle_pedido', pedido: 'id_pedido', cliente: 'id_cliente', usuario: 'id_usuario' };
    for (const t of ORDEN) {
      const res = await client.query(`DELETE FROM ${t} WHERE ${pkDe[t]} = ANY($1) RETURNING ${pkDe[t]}`, [ESPERADO[t]]);
      if (res.rowCount !== ESPERADO[t].length) throw new Error(`${t}: se borraron ${res.rowCount} filas y se esperaban ${ESPERADO[t].length}`);
      console.log(`  ✓ ${t}: ${res.rowCount}`);
    }
    await client.query('COMMIT');
    console.log('✅ Base limpia (COMMIT).');

    // 4) Archivos, después del COMMIT (no son transaccionales).
    for (const archivo of ARCHIVOS) {
      try {
        fs.unlinkSync(path.join(DIR_COMPROBANTES, archivo));
        console.log(`  ✓ archivo ${archivo}`);
      } catch (error) {
        console.error(`  ⚠️ No se pudo borrar ${archivo}: ${error.message} (la base ya quedó limpia; bórralo a mano)`);
        process.exitCode = 1;
      }
    }
  }
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(`❌ Sin cambios (ROLLBACK): ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
