const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db'); // Asegúrate de importar la conexión a la BD

module.exports = async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Token requerido' });

  const bearer = /^Bearer\s+([^\s]+)$/i.exec(authHeader);
  if (!bearer || bearer[1].length > 4096) return res.status(401).json({ message: 'Token inválido' });
  const token = bearer[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded;

    if (!Number.isSafeInteger(Number(decoded.id)) || Number(decoded.id) <= 0) {
      return res.status(401).json({ message: 'Token inválido' });
    }
    const [user] = await pool.query('SELECT activo, rol, must_change_password FROM users WHERE id = ?', [decoded.id]);
    if (!user.length || user[0].activo !== 1) {
      return res.status(401).json({ message: 'Usuario inactivo' });
    }

    req.user.rol = user[0].rol;
    req.user.mustChangePassword = Boolean(user[0].must_change_password);
    if (req.user.mustChangePassword && !req.path.endsWith('/change-temporary-password')) {
      return res.status(403).json({
        code: 'TEMPORARY_PASSWORD_CHANGE_REQUIRED',
        message: 'Debes cambiar tu contraseña temporal antes de continuar.'
      });
    }

    const [sessions] = await pool.query(
      'SELECT id FROM sessions WHERE user_id = ? AND token IN (?, ?) AND activo = 1 AND expiracion > NOW()',
      [decoded.id, crypto.createHash('sha256').update(token).digest('hex'), token],
    );
    if (!sessions.length) {
      return res.status(401).json({ message: 'La sesión expiró o fue cerrada. Inicia sesión nuevamente.' });
    }

    next();
  } catch (err) {
    console.error('Error JWT:', err.message);
    return res.status(401).json({ message: 'Token inválido' });
  }
};
