/**
 * CENAREPAS - Comparador de esquemas PostgreSQL (esquema cenarepas).
 *
 * Compara dos bases del mismo servidor y muestra cada diferencia:
 *   1. Tablas.
 *   2. Columnas: posición, tipo, longitud, precisión, nulos y valor por defecto.
 *   3. Restricciones: definición completa (PK, FK con ON DELETE/UPDATE, UNIQUE, CHECK).
 *   4. Índices: definición completa.
 *   5. Secuencias: tipo, inicio, incremento, mínimo, máximo y ciclo.
 *   6. Comentarios de tablas y columnas.
 *   7. Triggers y funciones del esquema, y extensiones.
 *   8. Seguridad: roles (nombre, descripción, estado), permisos (módulo, acción,
 *      estado) y rol_permiso, comparados por nombre y no por id.
 *
 * Solo lee: las dos conexiones se abren en modo de solo lectura.
 *
 * USO (desde la raíz de PROTOTIPO):
 *   node Base_Datos/herramientas/comparar_esquemas.js [base_referencia] [base_objetivo]
 *   Por defecto: cenarepas_staging frente a cenarepas_verificacion.
 *
 * CREDENCIALES: no hay ninguna en este archivo (ver conexion.js).
 *
 * SALIDA: código 0 si no hay diferencias, 1 si las hay o si hubo un error.
 */

const { config, conectar } = require('./conexion');

const { host, port, user, esquema } = config;

const base1 = process.argv[2] || 'cenarepas_staging';
const base2 = process.argv[3] || 'cenarepas_verificacion';

/**
 * Cada consulta devuelve filas con una clave (qué objeto es) y una
 * definición (cómo es). Se comparan las dos bases por clave.
 * $1 es el nombre del esquema.
 */
const CONSULTAS = [
  {
    titulo: 'Tablas',
    sql: `SELECT table_name AS clave, table_type AS definicion
          FROM information_schema.tables WHERE table_schema = $1`,
  },
  {
    titulo: 'Columnas',
    sql: `SELECT table_name || '.' || column_name AS clave,
                 concat_ws(' | ', 'posición ' || ordinal_position, data_type, udt_name,
                           'longitud ' || character_maximum_length,
                           'precisión ' || numeric_precision || ',' || numeric_scale,
                           CASE is_nullable WHEN 'YES' THEN 'NULL' ELSE 'NOT NULL' END,
                           'defecto ' || column_default) AS definicion
          FROM information_schema.columns WHERE table_schema = $1`,
  },
  {
    titulo: 'Restricciones',
    sql: `SELECT c.conrelid::regclass::text || ' ' || c.conname AS clave, pg_get_constraintdef(c.oid) AS definicion
          FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace
          WHERE n.nspname = $1`,
  },
  {
    titulo: 'Índices',
    sql: `SELECT tablename || ' ' || indexname AS clave, indexdef AS definicion
          FROM pg_indexes WHERE schemaname = $1`,
  },
  {
    titulo: 'Secuencias',
    sql: `SELECT sequencename AS clave,
                 concat_ws(' | ', data_type, 'inicio ' || start_value, 'incremento ' || increment_by,
                           'mínimo ' || min_value, 'máximo ' || max_value, CASE WHEN cycle THEN 'ciclo' END) AS definicion
          FROM pg_sequences WHERE schemaname = $1`,
  },
  {
    titulo: 'Comentarios',
    sql: `SELECT c.relname || COALESCE('.' || a.attname, '') AS clave, d.description AS definicion
          FROM pg_description d
          JOIN pg_class c ON c.oid = d.objoid AND d.classoid = 'pg_class'::regclass
          JOIN pg_namespace n ON n.oid = c.relnamespace
          LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = d.objsubid AND d.objsubid > 0
          WHERE n.nspname = $1`,
  },
  {
    titulo: 'Triggers',
    sql: `SELECT t.tgrelid::regclass::text || ' ' || t.tgname AS clave, pg_get_triggerdef(t.oid) AS definicion
          FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = $1 AND NOT t.tgisinternal`,
  },
  {
    titulo: 'Funciones',
    sql: `SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS clave,
                 md5(pg_get_functiondef(p.oid)) AS definicion
          FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE n.nspname = $1 AND p.prokind IN ('f', 'p')`,
  },
  {
    titulo: 'Extensiones',
    sql: `SELECT e.extname AS clave, 'esquema ' || n.nspname AS definicion
          FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
          WHERE $1::text IS NOT NULL`,
  },
  {
    titulo: 'Roles (por nombre)',
    sql: `SELECT nombre AS clave, concat_ws(' | ', descripcion, estado) AS definicion FROM ${esquema}.rol
          WHERE $1::text IS NOT NULL`,
  },
  {
    titulo: 'Permisos (por módulo y acción)',
    sql: `SELECT modulo || ':' || accion AS clave, estado AS definicion FROM ${esquema}.permiso
          WHERE $1::text IS NOT NULL`,
  },
  {
    titulo: 'Rol-permiso (por nombre)',
    sql: `SELECT r.nombre || ' → ' || p.modulo || ':' || p.accion AS clave, 'asignado' AS definicion
          FROM ${esquema}.rol_permiso rp
          JOIN ${esquema}.rol r ON r.id_rol = rp.id_rol
          JOIN ${esquema}.permiso p ON p.id_permiso = rp.id_permiso
          WHERE $1::text IS NOT NULL`,
  },
];

async function leer(client, sql) {
  const res = await client.query(sql, [esquema]);
  const mapa = new Map();
  for (const fila of res.rows) mapa.set(fila.clave, fila.definicion ?? '');
  return mapa;
}

async function main() {
  console.log('====================================================================');
  console.log('   CENAREPAS - COMPARADOR DE ESQUEMAS POSTGRESQL');
  console.log('====================================================================');
  console.log(`Servidor:          ${host}:${port} (usuario ${user})`);
  console.log(`Esquema:           ${esquema}`);
  console.log(`Base de referencia: ${base1}`);
  console.log(`Base objetivo:      ${base2}`);
  console.log('--------------------------------------------------------------------');

  if (base1 === base2) {
    console.error(`❌ Las dos bases son la misma (${base1}): no hay nada que comparar.`);
    process.exitCode = 1;
    return;
  }

  let c1;
  let c2;
  try {
    c1 = await conectar(base1);
    c2 = await conectar(base2);
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
    process.exitCode = 1;
    await c1?.end();
    return;
  }

  let total = 0;
  try {
    for (const { titulo, sql } of CONSULTAS) {
      const [m1, m2] = await Promise.all([leer(c1, sql), leer(c2, sql)]);
      const diferencias = [];
      for (const [clave, def1] of m1) {
        if (!m2.has(clave)) diferencias.push(`   ❌ Falta en ${base2}: ${clave}`);
        else if (m2.get(clave) !== def1) {
          diferencias.push(`   ❌ Distinto: ${clave}\n      ${base1}: ${def1}\n      ${base2}: ${m2.get(clave)}`);
        }
      }
      for (const clave of m2.keys()) {
        if (!m1.has(clave)) diferencias.push(`   ❌ Sobra en ${base2}: ${clave}`);
      }
      const estado = diferencias.length === 0 ? '✅ iguales' : `❌ ${diferencias.length} diferencia(s)`;
      console.log(`\n${titulo}: ${base1}=${m1.size}, ${base2}=${m2.size} → ${estado}`);
      diferencias.forEach((d) => console.log(d));
      total += diferencias.length;
    }

    console.log('\n--------------------------------------------------------------------');
    if (total === 0) {
      console.log('RESULTADO: sin diferencias.');
    } else {
      console.log(`RESULTADO: ${total} diferencia(s).`);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('❌ Error durante la comparación:', err.message);
    process.exitCode = 1;
  } finally {
    await c1.end();
    await c2.end();
  }
}

main();
