const pool = require('../config/db');
const { registrarActividad } = require('./activityService');

const getSalesByDate = async (from, to) => {
  let query = `
    SELECT v.id, v.fecha, p.name as product, dv.cantidad,
           (dv.cantidad * dv.precio_unitario) as total,
           u.nombre as usuario
    FROM ventas v
    JOIN detalle_ventas dv ON v.id = dv.venta_id
    JOIN products p ON dv.producto_id = p.id
    LEFT JOIN users u ON v.user_id = u.id
  `;
  const params = [];

  query += ' WHERE v.anulada = 0';
  if (from && to) {
    query += ' AND v.fecha >= ? AND v.fecha < DATE_ADD(?, INTERVAL 1 DAY)';
    params.push(from, to);
  } else if (from) {
    query += ' AND v.fecha >= ?';
    params.push(from);
  } else if (to) {
    query += ' AND v.fecha < DATE_ADD(?, INTERVAL 1 DAY)';
    params.push(to);
  }

  query += ' ORDER BY v.fecha ASC LIMIT ?';
  params.push(10000);

  const [result] = await pool.query(query, params);
  return result;
};

const logReportActivity = async (descripcion, userId, detalles) => {
  await registrarActividad({ userId, tipo: 'reporte', descripcion, detalles });
};

module.exports = {
  getSalesByDate,
  logReportActivity
};
