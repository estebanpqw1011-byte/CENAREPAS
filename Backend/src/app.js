import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { config } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:4000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir llamadas sin origin (Postman/móvil nativo) y cualquier localhost/127.0.0.1 en cualquier puerto
    const isLocalhost = !origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    if (isLocalhost || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Permitir en desarrollo para máxima compatibilidad
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200,
}));

app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos subidos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Ruta raíz — confirma que la API está viva
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'CENAREPAS API funcionando correctamente',
    docs: '/api/v1',
    health: '/api/v1/health'
  });
});

// API Routes (compatibilidad con /api y /api/v1)
app.use('/api/v1', routes);
app.use('/api', routes);


// 404 handler
app.use(notFoundHandler);

// Global Error handler
app.use(errorHandler);

export default app;