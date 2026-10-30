// services/sessionService.js
const pool = require('../config/db');
const { hashToken } = require('../utils/tokenHash');

const registrarSesion = async ({ userId, token, ip, userAgent, expiracion }) => {
  try {
    await pool.query(
      `INSERT INTO sessions (user_id, token, ip_address, user_agent, expiracion) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, hashToken(token), ip, String(userAgent || '').slice(0, 512), expiracion]
    );
  } catch (err) {
    console.error('❌ Error al registrar sesión:', err.message);
    throw err;
  }
};

const cerrarSesion = async (token) => {
  try {
    await pool.query(
      'UPDATE sessions SET activo = FALSE WHERE token IN (?, ?)',
      [hashToken(token), token]
    );
  } catch (err) {
    console.error('❌ Error al cerrar sesión:', err.message);
    throw err;
  }
};

module.exports = {
  registrarSesion,
  cerrarSesion,
};
