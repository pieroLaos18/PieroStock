// src/jobs/cleanExpiredTokens.js

const pool = require('../config/db');

const limpiarTokensExpirados = async () => {
  try {
    const [pendingUsers] = await pool.query(
      'DELETE FROM pending_users WHERE token_expires_at < NOW()'
    );
    const [sessions] = await pool.query(
      'DELETE FROM sessions WHERE expiracion < NOW() OR activo = 0'
    );
    if (pendingUsers.affectedRows || sessions.affectedRows) {
      console.log(
        `🧹 Limpieza: ${pendingUsers.affectedRows} registros pendientes y ${sessions.affectedRows} sesiones expiradas eliminadas.`,
      );
    }
  } catch (err) {
    console.error('❌ Error al limpiar tokens expirados:', err);
  }
};

module.exports = limpiarTokensExpirados;
