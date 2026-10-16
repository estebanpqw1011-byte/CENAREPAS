import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 4000,
  // Ver config.db.ssl en env.js (DB_SSL, sslmode de DATABASE_URL, host de Render).
  ssl: config.db.ssl
    ? { rejectUnauthorized: false }
    : false,
  // Esquema por defecto como parámetro de arranque: PostgreSQL lo aplica al
  // abrir la conexión, antes de la primera consulta. (Un SET en
  // pool.on('connect') no se espera y corre en paralelo con esa consulta.)
  options: `-c search_path=${config.db.schema},public`,
});

pool.on('error', (err) => {
  console.warn('[DB Pool Warning]:', err.message);
});

export const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (config.nodeEnv === 'development') {
    // console.log(`[SQL Query] (${duration}ms):`, text);
  }
  return res;
};

export const checkDbConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    const res = await client.query('SELECT NOW() AS now, current_schema() AS schema');
    console.log(`✅ [Database]: Conexión exitosa a PostgreSQL (${config.db.database}.${config.db.schema}) a las ${res.rows[0].now}`);
    return true;
  } catch (err) {
    // ECONNREFUSED llega como AggregateError, con message vacío.
    const detalle = err.message || err.code || String(err);
    console.warn(`⚠️ [Database]: No se pudo conectar a PostgreSQL en ${config.db.host}:${config.db.port}/${config.db.database} (ssl: ${config.db.ssl}) (${detalle}). Verifica DATABASE_URL o las variables DB_* (Backend/.env)`);
    return false;
  } finally {
    if (client) client.release();
  }
};

// La rama prototipo-movil necesita las migraciones 001-006 (solo aplicadas en
// cenarepas_staging). Sin ellas el login y todas las rutas protegidas fallan
// con 500, porque consultan cliente.id_usuario.
export const checkMigraciones = async () => {
  try {
    const res = await pool.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = 'cliente' AND column_name = 'id_usuario'`,
      [config.db.schema]
    );
    if (res.rowCount > 0) return true;
  } catch (err) {
    console.warn(`⚠️ [Database]: No se pudieron verificar las migraciones (${err.message}).`);
    return false;
  }
  console.error('\n==========================================');
  console.error(`❌ [Database]: La base "${config.db.database}" NO tiene las migraciones 001-006`);
  console.error('   (falta la columna cliente.id_usuario).');
  console.error('   El login y las rutas protegidas responderán 500 con cualquier usuario.');
  console.error('');
  console.error('   Detén este servidor y arráncalo contra Staging con:');
  console.error('');
  console.error('       npm run dev:staging');
  console.error('');
  console.error('   (o "npm run start:staging" sin recarga automática)');
  console.error('==========================================\n');
  return false;
};

export default { pool, query, checkDbConnection, checkMigraciones };
