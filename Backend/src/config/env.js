import dotenv from 'dotenv';

// Archivo de entorno: `.env` por defecto; `node src/server.js --env=staging`
// (o ENV_FILE=.env.staging) carga `.env.staging`.
const envArg = process.argv.find((arg) => arg.startsWith('--env='));
const envFile = process.env.ENV_FILE || (envArg ? `.env.${envArg.split('=')[1]}` : '.env');
dotenv.config({ path: envFile, quiet: true });

// Conexión a PostgreSQL: DATABASE_URL (la que entrega Render) tiene prioridad;
// si no está, se usan las variables DB_*.
const databaseUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL.trim()) : null;
const dbHost = databaseUrl ? databaseUrl.hostname : (process.env.DB_HOST ? process.env.DB_HOST.trim() : 'localhost');

// SSL: DB_SSL=true/false manda; si no, el sslmode de DATABASE_URL; si no, se
// activa para los hosts de Render (dpg-*, *.render.com) y en producción.
const dbSslEnv = process.env.DB_SSL ? process.env.DB_SSL.trim().toLowerCase() : '';
const sslmode = databaseUrl ? databaseUrl.searchParams.get('sslmode') : null;
const dbSsl = dbSslEnv
  ? dbSslEnv === 'true'
  : sslmode
    ? sslmode !== 'disable'
    : /^dpg-/.test(dbHost) || dbHost.endsWith('.render.com')
      || (process.env.NODE_ENV || '').trim() === 'production';

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT.trim(), 10) : 4000,
  nodeEnv: process.env.NODE_ENV ? process.env.NODE_ENV.trim() : 'development',
  frontendUrl: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.trim() : 'http://localhost:5173',
  db: {
    host: dbHost,
    port: databaseUrl
      ? parseInt(databaseUrl.port || '5432', 10)
      : parseInt(process.env.DB_PORT ? process.env.DB_PORT.trim() : '5432', 10),
    user: databaseUrl
      ? decodeURIComponent(databaseUrl.username)
      : (process.env.DB_USER ? process.env.DB_USER.trim() : 'postgres'),
    password: databaseUrl
      ? decodeURIComponent(databaseUrl.password)
      : (process.env.DB_PASSWORD ? process.env.DB_PASSWORD.trim() : 'postgres'),
    database: databaseUrl
      ? decodeURIComponent(databaseUrl.pathname.replace(/^\//, ''))
      : (process.env.DB_NAME ? process.env.DB_NAME.trim() : 'cenarepas_db'),
    schema: process.env.DB_SCHEMA ? process.env.DB_SCHEMA.trim() : 'cenarepas',
    ssl: dbSsl,
  },
  // Correo (f). Fuera de producción, por defecto "consola" (no envía nada).
  correo: {
    proveedor: (process.env.CORREO_PROVEEDOR ||
      ((process.env.NODE_ENV || '').trim() === 'production' ? 'brevo' : 'consola')).trim(),
    brevoApiKey: process.env.BREVO_API_KEY ? process.env.BREVO_API_KEY.trim() : '',
    remitente: process.env.CORREO_REMITENTE ? process.env.CORREO_REMITENTE.trim() : '',
    remitenteNombre: process.env.CORREO_REMITENTE_NOMBRE ? process.env.CORREO_REMITENTE_NOMBRE.trim() : 'CENAREPAS',
  },
  jwt: {
    secret: process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : 'cenarepas_super_secret_jwt_key_2026_masarepas',
    expiresIn: process.env.JWT_EXPIRES_IN ? process.env.JWT_EXPIRES_IN.trim() : '24h',
  },
};

export const env = config;
export default config;
