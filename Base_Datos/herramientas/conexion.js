/**
 * Conexión de solo lectura para las herramientas de Base_Datos.
 *
 * No hay credenciales en el código: se leen de las variables de entorno
 * DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_SCHEMA; si no están, de
 * Backend/.env.staging y luego de Backend/.env (solo esas cinco variables).
 * El nombre de la base lo decide cada herramienta (nunca DB_NAME).
 */

const fs = require('fs');
const path = require('path');

const VARIABLES = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_SCHEMA'];

function cargarEnvBackend() {
  const backendDir = path.resolve(__dirname, '../../Backend');
  for (const archivo of ['.env.staging', '.env'].map((n) => path.join(backendDir, n))) {
    if (!fs.existsSync(archivo)) continue;
    for (const linea of fs.readFileSync(archivo, 'utf8').split(/\r?\n/)) {
      const recortada = linea.trim();
      if (!recortada || recortada.startsWith('#')) continue;
      const idx = recortada.indexOf('=');
      if (idx === -1) continue;
      const clave = recortada.slice(0, idx).trim();
      const valor = recortada.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (VARIABLES.includes(clave) && !process.env[clave]) process.env[clave] = valor;
    }
  }
}

function cargarPg() {
  try {
    return require('pg');
  } catch {
    try {
      return require(path.resolve(__dirname, '../../Backend/node_modules/pg'));
    } catch {
      console.error('No se encontró el módulo "pg". Ejecuta npm install en Backend.');
      process.exit(1);
    }
  }
}

cargarEnvBackend();
const { Client } = cargarPg();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  esquema: process.env.DB_SCHEMA || 'cenarepas',
};

/** Abre una conexión a `base` en modo de solo lectura. */
async function conectar(base) {
  const client = new Client({ host: config.host, port: config.port, user: config.user, password: config.password, database: base });
  await client.connect();
  await client.query('SET default_transaction_read_only = on');
  return client;
}

module.exports = { config, conectar };
