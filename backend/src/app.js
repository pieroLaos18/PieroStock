require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');
const securityHeaders = require('./middleware/securityHeaders');
const rateLimit = require('./middleware/rateLimit');

const app = express();
const uploadsDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5174')
  .split(',').map(origin => origin.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600
}));
app.use(securityHeaders);
app.use('/api', rateLimit({ name: 'api', windowMs: 60 * 1000, max: 600 }));
app.use(express.json({ limit: '1mb', strict: true }));
app.use(express.urlencoded({ limit: '100kb', extended: false, parameterLimit: 50 }));
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch {
    res.status(503).json({ ok: false, database: 'unavailable' });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));
app.use('/api/actividades', require('./routes/activity'));

app.use((error, _req, res, _next) => {
  if (error.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'La imagen debe pesar menos de 5 MB.' });
  if (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE' || error.message?.startsWith('Usa una imagen')) {
    return res.status(400).json({ message: error.message || 'Solo puedes subir una imagen de perfil.' });
  }
  if (error.type === 'entity.too.large') return res.status(413).json({ message: 'La solicitud supera el tamaño permitido.' });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'El cuerpo de la solicitud no es JSON válido.' });
  console.error('[api] Error inesperado:', error?.message || 'UNKNOWN_ERROR');
  res.status(500).json({ message: 'Error interno del servidor' });
});

module.exports = app;
