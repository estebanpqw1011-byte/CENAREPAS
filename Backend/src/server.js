import app from './app.js';
import { env } from './config/env.js';
import { checkDbConnection, checkMigraciones } from './config/db.js';
import { estadoAlmacenamiento } from './utils/almacenamiento.js';

// Variable de entorno PORT (la asigna Render); config.port usa 4000 si no llega.
const PORT = env.port;

async function startServer() {
  console.log('==========================================');
  console.log('🚀 Iniciando Servidor CENAREPAS Backend...');
  console.log('==========================================');
  
  // Test connection to PostgreSQL
  const dbConnected = await checkDbConnection();
  if (!dbConnected) {
    console.warn('⚠️  El servidor correrá en modo resiliente. Cuando configures la base de datos PostgreSQL en el archivo .env, las consultas responderán directamente de la base de datos.');
  } else {
    await checkMigraciones();
  }

  // Dónde se guardan los archivos: Cloudinary, disco (solo local) o error (nube sin Cloudinary).
  const almacenamiento = estadoAlmacenamiento();
  (almacenamiento.nivel === 'error' ? console.error : almacenamiento.nivel === 'aviso' ? console.warn : console.log)(almacenamiento.mensaje);

  app.listen(PORT, () => {
    console.log(`✅ Servidor CENAREPAS Backend escuchando en http://localhost:${PORT}`);
    console.log(`📡 API v1 disponible en http://localhost:${PORT}/api/v1`);
    console.log(`🩺 Health check: http://localhost:${PORT}/api/v1/health`);
    console.log('==========================================\n');
  });
}

startServer();
