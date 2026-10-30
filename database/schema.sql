-- Esquema inicial para una base de datos NUEVA del Sistema de Ventas.
-- Selecciona la base sales_system antes de ejecutar este archivo.

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  correo_electronico VARCHAR(254) NOT NULL,
  password VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NULL,
  rol VARCHAR(30) NOT NULL DEFAULT 'cajero',
  direccion VARCHAR(255) NULL,
  imagen VARCHAR(500) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  verificado TINYINT(1) NOT NULL DEFAULT 0,
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  is_online TINYINT(1) NOT NULL DEFAULT 0,
  last_login DATETIME NULL,
  reset_token VARCHAR(128) NULL,
  reset_token_expires DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (correo_electronico),
  UNIQUE KEY uq_users_reset_token (reset_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pending_users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  correo_electronico VARCHAR(254) NOT NULL,
  password VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NULL,
  rol VARCHAR(30) NOT NULL DEFAULT 'cajero',
  direccion VARCHAR(255) NULL,
  token_verificacion CHAR(64) NOT NULL,
  token_expires_at DATETIME NOT NULL,
  ultimo_envio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pending_users_email (correo_electronico),
  UNIQUE KEY uq_pending_users_token (token_verificacion),
  KEY idx_pending_users_expiry (token_expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token VARCHAR(512) NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  expiracion DATETIME NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_token (token),
  KEY idx_sessions_user_active (user_id, activo),
  KEY idx_sessions_expiry (expiracion),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  purchase_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  category VARCHAR(100) NOT NULL,
  marca VARCHAR(100) NOT NULL,
  unidad_medida VARCHAR(50) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  stock_min INT NOT NULL DEFAULT 0,
  stock_max INT NOT NULL DEFAULT 0,
  image VARCHAR(500) NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_products_active_name (activo, name),
  KEY idx_products_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ventas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente VARCHAR(150) NULL,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subtotal DECIMAL(12,2) NOT NULL,
  impuesto DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  user_id INT UNSIGNED NULL,
  metodo_pago VARCHAR(50) NULL,
  anulada TINYINT(1) NOT NULL DEFAULT 0,
  motivo_anulacion TEXT NULL,
  tipo_comprobante VARCHAR(30) NOT NULL DEFAULT 'boleta',
  numero_comprobante VARCHAR(50) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ventas_fecha_anulada (fecha, anulada),
  KEY idx_ventas_user (user_id),
  CONSTRAINT fk_ventas_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS detalle_ventas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  venta_id INT UNSIGNED NOT NULL,
  producto_id INT UNSIGNED NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_detalle_ventas_sale (venta_id),
  KEY idx_detalle_ventas_product (producto_id),
  CONSTRAINT fk_detalle_ventas_sale FOREIGN KEY (venta_id) REFERENCES ventas (id) ON DELETE CASCADE,
  CONSTRAINT fk_detalle_ventas_product FOREIGN KEY (producto_id) REFERENCES products (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_batches (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id INT UNSIGNED NOT NULL,
  codigo_lote VARCHAR(100) NOT NULL,
  cantidad_inicial INT UNSIGNED NOT NULL,
  cantidad_disponible INT UNSIGNED NOT NULL,
  fecha_ingreso DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_vencimiento DATE NULL,
  proveedor VARCHAR(150) NULL,
  user_id INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_product_batch_code (product_id, codigo_lote),
  KEY idx_product_batches_fifo (product_id, cantidad_disponible, fecha_ingreso, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sale_batch_allocations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  detalle_venta_id INT UNSIGNED NOT NULL,
  batch_id INT UNSIGNED NOT NULL,
  cantidad INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sale_batch_allocations_detail (detalle_venta_id),
  KEY idx_sale_batch_allocations_batch (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NULL,
  descripcion TEXT NOT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  usuario VARCHAR(150) NULL,
  tipo VARCHAR(50) NULL,
  detalles TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_activities_fecha (fecha),
  KEY idx_activities_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
