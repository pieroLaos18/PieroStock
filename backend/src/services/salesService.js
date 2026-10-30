// salesService.js

const pool = require('../config/db');
const { registrarActividad } = require('./activityService');

// Obtener todas las ventas con sus productos
async function getAllSalesWithProducts(userId = null) {
  const [ventas] = userId === null
    ? await pool.query('SELECT * FROM ventas ORDER BY fecha DESC LIMIT 500')
    : await pool.query('SELECT * FROM ventas WHERE user_id = ? ORDER BY fecha DESC LIMIT 500', [userId]);
  if (ventas.length === 0) return [];

  const ventaIds = ventas.map(v => v.id);
  if (ventaIds.length === 0) return ventas; // PREVENCIÓN IMPORTANTE

  const [productos] = await pool.query(
    `SELECT dv.venta_id, dv.producto_id as id, p.name, dv.cantidad, dv.precio_unitario as precio
     FROM detalle_ventas dv
     JOIN products p ON dv.producto_id = p.id
     WHERE dv.venta_id IN (${ventaIds.map(() => '?').join(',')})`,
    ventaIds
  );

  for (const venta of ventas) {
    venta.productos = productos.filter(p => p.venta_id === venta.id);
  }

  return ventas;
}

// Obtener resumen de ventas (hoy y mes actual)
async function getSalesSummary() {
  const [hoy] = await pool.query(
    "SELECT IFNULL(SUM(total),0) as hoy FROM ventas WHERE DATE(fecha) = CURDATE() AND anulada = 0"
  );
  const [mes] = await pool.query(
    "SELECT IFNULL(SUM(total),0) as mes FROM ventas WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE()) AND anulada = 0"
  );
  return { hoy: hoy[0].hoy, mes: mes[0].mes };
}

// Obtener ventas por día de los últimos días
async function getSalesByDay(days = 7) {
  try {
    // Consulta agregada; nunca registra información de clientes o importes en logs.
    // Ahora la consulta principal con formato de fecha corregido
    const [rows] = await pool.query(
      `SELECT 
         DATE_FORMAT(fecha, '%Y-%m-%d') as fecha,
         CASE DAYOFWEEK(fecha)
           WHEN 1 THEN 'Domingo'
           WHEN 2 THEN 'Lunes' 
           WHEN 3 THEN 'Martes'
           WHEN 4 THEN 'Miércoles'
           WHEN 5 THEN 'Jueves'
           WHEN 6 THEN 'Viernes'
           WHEN 7 THEN 'Sábado'
         END as dia,
         SUM(total) as total,
         COUNT(*) as cantidad_ventas
       FROM ventas
       WHERE DATE(fecha) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
         AND anulada = 0
       GROUP BY 
         DATE(fecha),
         DATE_FORMAT(fecha, '%Y-%m-%d'),
         CASE DAYOFWEEK(fecha)
           WHEN 1 THEN 'Domingo'
           WHEN 2 THEN 'Lunes' 
           WHEN 3 THEN 'Martes'
           WHEN 4 THEN 'Miércoles'
           WHEN 5 THEN 'Jueves'
           WHEN 6 THEN 'Viernes'
           WHEN 7 THEN 'Sábado'
         END
       ORDER BY fecha DESC`,
      [days]
    );
    
// Si no hay datos en el rango específico, mostrar las últimas ventas agrupadas por día
    if (rows.length === 0) {
      const [lastSales] = await pool.query(
        `SELECT 
           DATE_FORMAT(fecha, '%Y-%m-%d') as fecha,
           CASE DAYOFWEEK(fecha)
             WHEN 1 THEN 'Domingo'
             WHEN 2 THEN 'Lunes' 
             WHEN 3 THEN 'Martes'
             WHEN 4 THEN 'Miércoles'
             WHEN 5 THEN 'Jueves'
             WHEN 6 THEN 'Viernes'
             WHEN 7 THEN 'Sábado'
           END as dia,
           SUM(total) as total,
           COUNT(*) as cantidad_ventas
         FROM ventas
         WHERE anulada = 0
         GROUP BY 
           DATE(fecha),
           DATE_FORMAT(fecha, '%Y-%m-%d'),
           CASE DAYOFWEEK(fecha)
             WHEN 1 THEN 'Domingo'
             WHEN 2 THEN 'Lunes' 
             WHEN 3 THEN 'Martes'
             WHEN 4 THEN 'Miércoles'
             WHEN 5 THEN 'Jueves'
             WHEN 6 THEN 'Viernes'
             WHEN 7 THEN 'Sábado'
           END
         ORDER BY fecha DESC
         LIMIT ?`,
        [days]
      );
      
      return lastSales.map(row => ({
        dia: row.dia,
        fecha: row.fecha,
        total: Number(row.total) || 0,
        cantidad_ventas: row.cantidad_ventas
      }));
    }
    
    return rows.map(row => ({
      dia: row.dia,
      fecha: row.fecha,
      total: Number(row.total) || 0,
      cantidad_ventas: row.cantidad_ventas
    }));
    
  } catch (error) {
    console.error(`[sales] Error en consulta diaria (${error.code || 'DB_ERROR'}).`);
    throw error;
  }
}

// Obtener ventas de la semana anterior
async function getSalesByDayPrevious() {
  const [rows] = await pool.query(
    `SELECT 
       DATE_FORMAT(fecha, '%Y-%m-%d') as fecha,
       CASE DAYOFWEEK(fecha)
         WHEN 1 THEN 'Domingo'
         WHEN 2 THEN 'Lunes' 
         WHEN 3 THEN 'Martes'
         WHEN 4 THEN 'Miércoles'
         WHEN 5 THEN 'Jueves'
         WHEN 6 THEN 'Viernes'
         WHEN 7 THEN 'Sábado'
       END as dia,
       SUM(total) as total 
     FROM ventas
     WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
       AND fecha < DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       AND anulada = 0
     GROUP BY 
       DATE(fecha),
       DATE_FORMAT(fecha, '%Y-%m-%d'),
       CASE DAYOFWEEK(fecha)
         WHEN 1 THEN 'Domingo'
         WHEN 2 THEN 'Lunes' 
         WHEN 3 THEN 'Martes'
         WHEN 4 THEN 'Miércoles'
         WHEN 5 THEN 'Jueves'
         WHEN 6 THEN 'Viernes'
         WHEN 7 THEN 'Sábado'
       END
     ORDER BY fecha ASC`
  );
  
  return rows.map(row => ({
    dia: row.dia,
    fecha: row.fecha,
    total: Number(row.total) || 0
  }));
}

// Obtener métodos de pago
async function getPaymentMethods() {
  const [rows] = await pool.query(
    `SELECT metodo_pago, SUM(total) as total FROM ventas WHERE anulada = 0 GROUP BY metodo_pago`
  );
  return rows;
}

// Obtener detalle de una venta por ID
async function getSaleById(id, userId = null) {
  const [venta] = userId === null
    ? await pool.query('SELECT * FROM ventas WHERE id = ?', [id])
    : await pool.query('SELECT * FROM ventas WHERE id = ? AND user_id = ?', [id, userId]);
  if (!venta.length) return null;
  const [productos] = await pool.query(
    `SELECT dv.*, p.name FROM detalle_ventas dv
     JOIN products p ON dv.producto_id = p.id WHERE dv.venta_id = ?`,
    [id]
  );
  const productosMapeados = productos.map(p => ({ ...p, precio: p.precio_unitario }));
  return { ...venta[0], productos: productosMapeados };
}

// Registrar nueva venta y actualizar stock
async function createSale({ productos, cliente = '', user_id, metodo_pago }) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Obtener precios actuales desde la base de datos
    const ids = productos.map(p => p.id);
    const [productosDB] = await conn.query(
      `SELECT id, price FROM products WHERE activo = 1 AND id IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    // Calcular totales desde los datos oficiales
    let subtotal = 0;
    for (const prod of productos) {
      const prodDB = productosDB.find(pdb => pdb.id === prod.id);
      if (!prodDB) throw new Error(`Producto con ID ${prod.id} no encontrado.`);
      subtotal += prod.cantidad * prodDB.price;
    }

    const impuesto = +(subtotal * 0.18).toFixed(2);
    const total = +(subtotal + impuesto).toFixed(2);

    // Insertar la venta principal
    const [insertResult] = await conn.query(
      `INSERT INTO ventas (cliente, fecha, subtotal, impuesto, total, user_id, metodo_pago)
       VALUES (?, NOW(), ?, ?, ?, ?, ?)`,
      [cliente, subtotal, impuesto, total, user_id, metodo_pago]
    );
    const ventaId = insertResult.insertId;

    // Descontar cada venta de los lotes más antiguos que aún tengan unidades (FIFO).
    for (const prod of productos) {
      const prodDB = productosDB.find(pdb => pdb.id === prod.id);
      const [[stockCheck]] = await conn.query('SELECT stock FROM products WHERE id = ? FOR UPDATE', [prod.id]);

      if (!stockCheck || stockCheck.stock < prod.cantidad) {
        throw new Error(`Stock insuficiente para el producto ID ${prod.id}`);
      }

      const [detailResult] = await conn.query(
        'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [ventaId, prod.id, prod.cantidad, prodDB.price]
      );

      const [batches] = await conn.query(
        `SELECT id, cantidad_disponible
         FROM product_batches
         WHERE product_id = ? AND cantidad_disponible > 0
         ORDER BY fecha_ingreso ASC, id ASC
         FOR UPDATE`,
        [prod.id]
      );
      const batchStock = batches.reduce((sum, batch) => sum + Number(batch.cantidad_disponible), 0);
      if (batchStock < Number(prod.cantidad)) {
        throw new Error(`Los lotes de ${prodDB.name} no cuadran con el stock disponible. Revisa el inventario antes de vender.`);
      }

      let remaining = Number(prod.cantidad);
      for (const batch of batches) {
        if (remaining === 0) break;
        const allocated = Math.min(remaining, Number(batch.cantidad_disponible));
        await conn.query(
          'UPDATE product_batches SET cantidad_disponible = cantidad_disponible - ? WHERE id = ?',
          [allocated, batch.id]
        );
        await conn.query(
          'INSERT INTO sale_batch_allocations (detalle_venta_id, batch_id, cantidad) VALUES (?, ?, ?)',
          [detailResult.insertId, batch.id, allocated]
        );
        remaining -= allocated;
      }

      await conn.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [prod.cantidad, prod.id]
      );
    }

    // Registrar en el historial de actividades
    await registrarActividad({
      userId: user_id,
      tipo: 'venta',
      descripcion: `Registró la venta #${ventaId}`,
      detalles: `Cliente: ${cliente || 'Sin nombre'} · Total: S/ ${total.toFixed(2)} · Pago: ${metodo_pago || 'No indicado'}`
    }, conn);

    await conn.commit();
    return ventaId;

  } catch (error) {
    await conn.rollback();
    console.error('Error en createSale:', error.message);
    throw new Error(`Error al registrar venta: ${error.message}`);
  } finally {
    conn.release();
  }
}

// Anular venta y recuperar stock
async function cancelSale(id, motivo, user_id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [ventaCheck] = await conn.query('SELECT anulada FROM ventas WHERE id = ? FOR UPDATE', [id]);
    if (ventaCheck.length === 0) throw new Error('Venta no encontrada');
    if (ventaCheck[0].anulada) throw new Error('La venta ya está anulada');

    await conn.query('UPDATE ventas SET anulada = 1, motivo_anulacion = ? WHERE id = ?', [motivo, id]);

    const [productos] = await conn.query('SELECT id, producto_id, cantidad FROM detalle_ventas WHERE venta_id = ?', [id]);
    for (const prod of productos) {
      const [allocations] = await conn.query(
        'SELECT batch_id, cantidad FROM sale_batch_allocations WHERE detalle_venta_id = ?',
        [prod.id]
      );

      if (allocations.length) {
        for (const allocation of allocations) {
          await conn.query(
            'UPDATE product_batches SET cantidad_disponible = cantidad_disponible + ? WHERE id = ?',
            [allocation.cantidad, allocation.batch_id]
          );
        }
      } else {
        // Las ventas anteriores al control por lotes devuelven unidades al lote inicial.
        const [[oldestBatch]] = await conn.query(
          'SELECT id FROM product_batches WHERE product_id = ? ORDER BY fecha_ingreso ASC, id ASC LIMIT 1 FOR UPDATE',
          [prod.producto_id]
        );
        if (oldestBatch) {
          await conn.query(
            'UPDATE product_batches SET cantidad_disponible = cantidad_disponible + ? WHERE id = ?',
            [prod.cantidad, oldestBatch.id]
          );
        } else {
          await conn.query(`
            INSERT INTO product_batches
              (product_id, codigo_lote, cantidad_inicial, cantidad_disponible, user_id)
            VALUES (?, ?, ?, ?, ?)`,
          [prod.producto_id, `DEV-${id}-${prod.producto_id}`, prod.cantidad, prod.cantidad, user_id || null]);
        }
      }
      await conn.query('UPDATE products SET stock = stock + ? WHERE id = ?', [prod.cantidad, prod.producto_id]);
    }

    await registrarActividad({
      userId: user_id,
      tipo: 'venta',
      descripcion: `Anuló la venta #${id}`,
      detalles: `Motivo: ${motivo || 'No especificado'}`
    }, conn);

    await conn.commit();
    return { message: 'Venta anulada correctamente y stock recuperado' };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

// Obtener productos más vendidos
async function getTopProducts(limit = 5) {
  const [rows] = await pool.query(
    `SELECT 
      p.id,
      p.name,
      p.category,
      p.image,
      SUM(dv.cantidad) as cantidad_vendida,
      SUM(dv.cantidad * dv.precio_unitario) as total_ingresos
     FROM detalle_ventas dv
     JOIN products p ON dv.producto_id = p.id
     JOIN ventas v ON dv.venta_id = v.id
     WHERE v.anulada = 0
     GROUP BY p.id, p.name, p.category, p.image
     ORDER BY cantidad_vendida DESC
     LIMIT ?`,
    [parseInt(limit)]
  );
  return rows;
}

// Sales leaders and seasonal replenishment estimates use completed history only.
async function getDashboardInsights() {
  const [[calendar]] = await pool.query('SELECT MONTH(CURDATE()) AS current_month');
  const [topSellers] = await pool.query(
    `SELECT u.id, u.nombre, u.rol, u.imagen,
            COUNT(v.id) AS ventas_realizadas,
            COALESCE(SUM(v.total), 0) AS total_vendido
     FROM ventas v
     JOIN users u ON u.id = v.user_id
     WHERE v.anulada = 0
     GROUP BY u.id, u.nombre, u.rol, u.imagen
     ORDER BY total_vendido DESC, ventas_realizadas DESC
     LIMIT 5`
  );

  const [monthlyRows] = await pool.query(
    `SELECT p.id, p.name, p.category, p.image, p.stock, p.stock_min, p.stock_max,
            YEAR(v.fecha) AS anio, MONTH(v.fecha) AS mes,
            SUM(dv.cantidad) AS unidades
     FROM products p
     JOIN detalle_ventas dv ON dv.producto_id = p.id
     JOIN ventas v ON v.id = dv.venta_id
     WHERE p.activo = 1
       AND v.anulada = 0
       AND v.fecha >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 36 MONTH)
       AND v.fecha < DATE_FORMAT(CURDATE(), '%Y-%m-01')
     GROUP BY p.id, p.name, p.category, p.image, p.stock, p.stock_min, p.stock_max,
              YEAR(v.fecha), MONTH(v.fecha)`
  );

  return { topSellers, monthlyRows, historyMonths: 36, currentMonth: Number(calendar.current_month) };
}

// Generar comprobante
async function generateComprobante(id, userId = null) {
  const [ventaRows] = userId === null
    ? await pool.query('SELECT * FROM ventas WHERE id = ?', [id])
    : await pool.query('SELECT * FROM ventas WHERE id = ? AND user_id = ?', [id, userId]);
  if (ventaRows.length === 0) return null;
  const [detalleRows] = await pool.query('SELECT * FROM detalle_ventas WHERE venta_id = ?', [id]);

  const venta = ventaRows[0];
  return {
    tipo: venta.tipo_comprobante || 'boleta',
    numero: venta.numero_comprobante || `B${venta.id.toString().padStart(6, '0')}`,
    fecha: venta.fecha,
    cliente: venta.cliente,
    metodo_pago: venta.metodo_pago,
    productos: detalleRows,
    subtotal: venta.subtotal,
    impuestos: venta.impuestos,
    total: venta.total
  };
}

module.exports = {
  getAllSalesWithProducts,
  getSalesResumen: getSalesSummary,
  getSalesByDay,
  getVentasPorDia: () => getSalesByDay(7),
  getVentasPorDiaAnterior: getSalesByDayPrevious,
  getMetodosPago: getPaymentMethods,
  getSaleById,
  createVenta: createSale,
  anularVenta: cancelSale,
  generarComprobante: generateComprobante,
  getTopProducts,
  getDashboardInsights
};
