require('dotenv').config();

const http = require('http');
const app = require('./app');
const pool = require('./config/db');
const limpiarDatosExpirados = require('./jobs/cleanExpiredTokens');
const realtimeHub = require('./services/realtimeHub');

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'your_super_secret_jwt_key_here' || process.env.JWT_SECRET.includes('replace_with')) {
    console.error('Configura JWT_SECRET con al menos 32 caracteres aleatorios en backend/.env antes de iniciar la API.');
    process.exitCode = 1;
    return;
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    const [tables] = await connection.query('SHOW TABLES');
    const availableTables = new Set(tables.map((row) => Object.values(row)[0]));
    const requiredTables = [
      'users',
      'pending_users',
      'sessions',
      'products',
      'ventas',
      'detalle_ventas',
      'activities',
    ];
    const missingTables = requiredTables.filter((table) => !availableTables.has(table));
    if (missingTables.length) {
      throw new Error(
        `Faltan tablas (${missingTables.join(', ')}). Inicializa database/schema.sql en una base nueva.`,
      );
    }
    const [passwordChangeColumn] = await connection.query("SHOW COLUMNS FROM users LIKE 'must_change_password'");
    if (!passwordChangeColumn.length) {
      throw new Error('Falta users.must_change_password. Ejecuta database/migrations/20261030_temporary_user_password.sql antes de iniciar.');
    }
    await connection.query(`
      CREATE TABLE IF NOT EXISTS product_batches (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        product_id INT UNSIGNED NOT NULL,
        codigo_lote VARCHAR(100) NOT NULL,
        cantidad_inicial INT UNSIGNED NOT NULL,
        cantidad_disponible INT UNSIGNED NOT NULL,
        fecha_ingreso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        fecha_vencimiento DATE NULL,
        proveedor VARCHAR(150) NULL,
        user_id INT UNSIGNED NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_product_batch_code (product_id, codigo_lote),
        KEY idx_product_batches_fifo (product_id, cantidad_disponible, fecha_ingreso, id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sale_batch_allocations (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        detalle_venta_id INT UNSIGNED NOT NULL,
        batch_id INT UNSIGNED NOT NULL,
        cantidad INT UNSIGNED NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_sale_batch_allocations_detail (detalle_venta_id),
        KEY idx_sale_batch_allocations_batch (batch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await connection.query(`
      INSERT INTO product_batches
        (product_id, codigo_lote, cantidad_inicial, cantidad_disponible, fecha_ingreso)
      SELECT p.id, CONCAT('INICIAL-', p.id), p.stock, p.stock, COALESCE(p.created_at, NOW())
      FROM products p
      WHERE p.stock > 0
        AND NOT EXISTS (SELECT 1 FROM product_batches b WHERE b.product_id = p.id)
    `);
    const [activityUserColumn] = await connection.query("SHOW COLUMNS FROM activities LIKE 'user_id'");
    if (activityUserColumn.length === 0) {
      await connection.query('ALTER TABLE activities ADD COLUMN user_id INT UNSIGNED NULL AFTER id');
      await connection.query('ALTER TABLE activities ADD INDEX idx_activities_user (user_id)');
      console.log('✅ Columna de usuario agregada al historial de actividades.');
    }
    await connection.query(`
      UPDATE activities a
      JOIN users u ON a.descripcion = CONCAT(
        'Inicio de sesión del usuario ', u.nombre, ' (', u.correo_electronico, ')'
      )
      SET a.user_id = u.id,
          a.usuario = CONCAT_WS(' ', u.nombre, u.apellido),
          a.tipo = COALESCE(a.tipo, 'login'),
          a.detalles = COALESCE(a.detalles, CONCAT('Cuenta: ', u.correo_electronico))
      WHERE a.user_id IS NULL
    `);
    console.log('✅ Conexión a MySQL establecida.');
  } catch (error) {
    console.error('❌ No se pudo iniciar la API:', error.message);
    process.exitCode = 1;
    connection?.release();
    connection = null;
    await pool.end();
    return;
  } finally {
    connection?.release();
  }

  await limpiarDatosExpirados();
  const cleanupTimer = setInterval(limpiarDatosExpirados, 15 * 60 * 1000);
  const server = http.createServer(app);
  realtimeHub.attachRealtimeHub(server);
  server.listen(PORT, () => {
    console.log(`🚀 API lista en http://localhost:${PORT}`);
  });

  const shutdown = (signal) => {
    console.log(`\n${signal}: cerrando el servidor…`);
    clearInterval(cleanupTimer);
    realtimeHub.closeRealtimeHub();
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

start();
