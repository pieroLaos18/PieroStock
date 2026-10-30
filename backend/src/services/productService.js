const pool = require('../config/db');
const crypto = require('crypto');
const { registrarActividad } = require('./activityService');

const productFields = new Set([
  'name', 'description', 'price', 'purchase_price', 'category', 'marca',
  'unidad_medida', 'stock_min', 'stock_max', 'image',
]);
const searchableProductFields = new Set(['id', 'name', 'category', 'marca', 'unidad_medida', 'activo', 'stock']);

const getAll = async () => {
  const [products] = await pool.query('SELECT * FROM products WHERE activo = 1');
  return products.map(p => ({ ...p, low_stock: Number(p.stock) <= Number(p.stock_min) }));
};

const getDestacados = async () => {
  const [rows] = await pool.query(`
    SELECT p.id, p.name, SUM(dv.cantidad) as vendidos, p.stock
    FROM detalle_ventas dv
    JOIN products p ON dv.producto_id = p.id
    GROUP BY p.id, p.name, p.stock
    ORDER BY vendidos DESC
    LIMIT 5
  `);
  return rows;
};

const insertProduct = async (data, userId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(`
      INSERT INTO products
        (name, description, price, purchase_price, category, marca, unidad_medida, stock, stock_min, stock_max, image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.name, data.description, data.price, data.purchase_price, data.category, data.marca,
      data.unidad_medida, data.stock, data.stock_min, data.stock_max, data.image]);
    const productId = result.insertId;
    if (Number(data.stock) > 0) {
      await connection.query(`
        INSERT INTO product_batches
          (product_id, codigo_lote, cantidad_inicial, cantidad_disponible, user_id)
        VALUES (?, ?, ?, ?, ?)`,
      [productId, `INICIAL-${productId}`, Number(data.stock), Number(data.stock), userId || null]);
    }
    await connection.commit();
    return productId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const updateProduct = async (id, data) => {
  const entries = Object.entries(data).filter(([key]) => productFields.has(key));
  if (!entries.length) throw new Error('No hay campos de producto válidos para actualizar.');
  const values = entries.map(([, value]) => value);
  const sets = entries.map(([key]) => `\`${key}\` = ?`).join(', ');
  values.push(id);
  await pool.query(`UPDATE products SET ${sets} WHERE id = ?`, values);
};

const softDelete = async (id) => {
  await pool.query('UPDATE products SET activo = 0 WHERE id = ?', [id]);
};

const getProductBatches = async (productId) => {
  const [rows] = await pool.query(
    `SELECT id, codigo_lote, cantidad_inicial, cantidad_disponible,
            fecha_ingreso, fecha_vencimiento, proveedor
     FROM product_batches
     WHERE product_id = ?
     ORDER BY (cantidad_disponible = 0), fecha_ingreso ASC, id ASC`,
    [productId]
  );
  return rows;
};

const receiveStock = async (productId, { cantidad, codigo_lote, proveedor, fecha_vencimiento }, userId) => {
  const quantity = Number(cantidad);
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    const error = new Error('La cantidad recibida debe ser un entero mayor que cero.');
    error.status = 400;
    throw error;
  }
  const expiryDate = String(fecha_vencimiento || '').trim();
  if (expiryDate) {
    const parsedExpiry = new Date(`${expiryDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate) || Number.isNaN(parsedExpiry.getTime()) || parsedExpiry.toISOString().slice(0, 10) !== expiryDate) {
      const error = new Error('La fecha de vencimiento no es válida.');
      error.status = 400;
      throw error;
    }
  }
  if (String(proveedor || '').trim().length > 150) {
    const error = new Error('El nombre del proveedor no puede superar 150 caracteres.');
    error.status = 400;
    throw error;
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[product]] = await connection.query(
      'SELECT id, name FROM products WHERE id = ? AND activo = 1 FOR UPDATE',
      [productId]
    );
    if (!product) {
      const error = new Error('No se encontró el producto activo.');
      error.status = 404;
      throw error;
    }

    const batchCode = String(codigo_lote || '').trim() ||
      `ENT-${productId}-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    if (batchCode.length > 100) {
      const error = new Error('El código del lote no puede superar 100 caracteres.');
      error.status = 400;
      throw error;
    }

    const [batchResult] = await connection.query(`
      INSERT INTO product_batches
        (product_id, codigo_lote, cantidad_inicial, cantidad_disponible,
         fecha_vencimiento, proveedor, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [productId, batchCode, quantity, quantity, expiryDate || null,
      proveedor?.trim() || null, userId]);
    await connection.query('UPDATE products SET stock = stock + ? WHERE id = ?', [quantity, productId]);
    await registrarActividad({
      userId,
      tipo: 'inventario',
      descripcion: `Registró una entrega de ${quantity} unidades de ${product.name}`,
      detalles: `Lote ${batchCode}${proveedor ? ` · Proveedor: ${proveedor.trim()}` : ''}`
    }, connection);
    await connection.commit();
    return { id: batchResult.insertId, codigo_lote: batchCode, cantidad: quantity };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const duplicate = new Error('Ese código ya existe para este producto. Usa otro código de lote.');
      duplicate.status = 409;
      throw duplicate;
    }
    throw error;
  } finally {
    connection.release();
  }
};

const getByFilter = async (field, value) => {
  if (!searchableProductFields.has(field)) {
    throw new Error('Campo de búsqueda no permitido.');
  }
  const [rows] = await pool.query(`SELECT * FROM products WHERE \`${field}\` = ? AND activo = 1`, [value]);
  return rows;
};

module.exports = {
  getAll,
  getDestacados,
  insertProduct,
  updateProduct,
  softDelete,
  getByFilter,
  getProductBatches,
  receiveStock
};
