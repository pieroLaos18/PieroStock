const pool = require('../config/db');
const realtimeHub = require('./realtimeHub');

async function registrarActividad({ userId, tipo, descripcion, detalles = null }, executor = pool) {
  if (!userId) throw new Error('Se requiere el usuario que realizó la actividad');

  const [[user]] = await executor.query(
    'SELECT nombre, apellido, correo_electronico FROM users WHERE id = ?',
    [userId]
  );
  const nombre = user
    ? [user.nombre, user.apellido].filter(Boolean).join(' ').trim()
    : `Usuario #${userId}`;
  const usuario = nombre.slice(0, 150);
  const activityDetails = [detalles, user?.correo_electronico ? `Cuenta: ${user.correo_electronico}` : null]
    .filter(Boolean)
    .join(' · ') || null;

  const [result] = await executor.query(
    `INSERT INTO activities (descripcion, usuario, tipo, detalles, user_id)
     VALUES (?, ?, ?, ?, ?)`,
    [descripcion, usuario, tipo, activityDetails, userId]
  );

  if (executor === pool) {
    realtimeHub.publishDataChanged({ entities: ['activities'], action: tipo || 'activity', actorId: userId, recordId: result.insertId });
  }
  return result.insertId;
}

module.exports = { registrarActividad };
