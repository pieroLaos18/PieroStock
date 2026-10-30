const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const { generarToken } = require('../utils/jwtHelper');
const { registrarSesion } = require('../services/sessionService');
const { enviarCorreoRecuperacion, enviarCorreoVerificacion, isEmailConfigured } = require('../utils/emailSender');
const { PASSWORD_POLICY_MESSAGE, isPasswordValid } = require('../utils/passwordPolicy');
const { registrarActividad } = require('../services/activityService');
const { hashToken } = require('../utils/tokenHash');
const realtimeHub = require('../services/realtimeHub');
const DUMMY_PASSWORD_HASH = '$2b$10$IDLg30InPr.UpVuRh9lIBOWern/nsJLZwV7eQGaKJAOnhiPnclELy';

const respondWithEmailError = (res, error, allowResend = false) => {
  const code = error?.code || 'EMAIL_DELIVERY_FAILED';
  console.error(`[auth] No se pudo enviar el correo (${code}).`);
  const message = code === 'EMAIL_CONFIG_MISSING'
    ? 'Configura EMAIL_USER y EMAIL_PASS en backend/.env y reinicia el backend.'
    : 'No se pudo enviar el correo. Revisa EMAIL_USER, EMAIL_PASS y la contraseña de aplicación de Gmail.';
  return res.status(503).json({ message, allowResend });
};

const login = async (req, res) => {
  const { correo_electronico, password } = req.body;

  try {
    const [users] = await pool.query(
      `SELECT id, correo_electronico, password, nombre, rol, imagen,
              activo, verificado, must_change_password
       FROM users WHERE correo_electronico = ? LIMIT 1`,
      [correo_electronico]
    );
    const user = users[0];

    if (!user) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return res.status(401).json({ message: 'Correo electrónico o contraseña incorrectos.' });
    }

    // Comprueba primero la contraseña para no revelar si la cuenta está verificada o activa.
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(401).json({ message: 'Correo electrónico o contraseña incorrectos.' });
    if (user.activo !== 1) return res.status(401).json({ message: 'Correo electrónico o contraseña incorrectos.' });
    if (user.verificado !== 1) {
      return res.status(403).json({ message: 'Tu cuenta aún no ha sido verificada. Revisa tu correo electrónico.' });
    }

    // ✅ Registrar último inicio de sesión y actividad
    await pool.query('UPDATE users SET last_login = NOW(), is_online = 1 WHERE id = ?', [user.id]);
    await registrarActividad({
      userId: user.id,
      tipo: 'login',
      descripcion: 'Inició sesión'
    });

    const token = generarToken(user);

    // ✅ Registrar sesión
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const expiracion = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await registrarSesion({
      userId: user.id,
      token,
      ip,
      userAgent,
      expiracion
    });

    res.status(200).json({
      token,
      requiresPasswordChange: Boolean(user.must_change_password),
      user: {
        id: user.id,
        name: user.nombre,
        email: user.correo_electronico,
        rol: user.rol,
        image: user.imagen || null,
      },
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const changeTemporaryPassword = async (req, res) => {
  const { password } = req.body;
  if (!isPasswordValid(password)) return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
  if (!req.user.mustChangePassword) return res.status(400).json({ message: 'Esta cuenta no requiere cambiar una contraseña temporal.' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?', [hashedPassword, req.user.id]);
    await registrarActividad({ userId: req.user.id, tipo: 'usuario', descripcion: 'Cambió su contraseña temporal' });
    return res.json({ message: 'Contraseña actualizada. Ya puedes usar el sistema.' });
  } catch (error) {
    console.error('[auth] No se pudo actualizar la contraseña temporal:', error.message);
    return res.status(500).json({ message: 'No se pudo actualizar la contraseña.' });
  }
};

const register = async (req, res) => {
  const { correo_electronico, password, nombre, apellido, direccion } = req.body;

  if (!isPasswordValid(password)) {
    return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
  }

  try {
    // Verifica si ya existe un usuario activo
    const normalizedEmail = correo_electronico.trim().toLowerCase();
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE correo_electronico = ?',
      [normalizedEmail]
    );
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'El email ya está en uso' });
    }

    // Verifica si ya está pendiente de verificación
    const [pending] = await pool.query(
      'SELECT * FROM pending_users WHERE correo_electronico = ?',
      [normalizedEmail]
    );

    if (pending.length > 0) {
      if (!isEmailConfigured()) {
        return respondWithEmailError(res, { code: 'EMAIL_CONFIG_MISSING' }, true);
      }

      const lastSent = new Date(pending[0].ultimo_envio);
      const now = new Date();
      const diffMs = now - lastSent;
      const diffMinutes = diffMs / (1000 * 60);

      if (diffMinutes < 5) {
        return res.status(400).json({
          message: 'Ya se ha enviado un correo de verificación. Intenta nuevamente en unos minutos.',
          allowResend: true
        });
      }

      // Si han pasado más de 5 minutos, actualiza el token y reenvía el correo
      const newToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min desde ahora

      await pool.query(
        `UPDATE pending_users 
         SET token_verificacion = ?, token_expires_at = ?, ultimo_envio = NOW()
         WHERE correo_electronico = ?`,
        [hashToken(newToken), tokenExpiresAt, normalizedEmail]
      );

      try {
      await enviarCorreoVerificacion(normalizedEmail, pending[0].nombre, newToken);
      } catch (emailError) {
        try {
          await pool.query(
            `UPDATE pending_users
             SET token_verificacion = ?, token_expires_at = ?, ultimo_envio = ?
             WHERE correo_electronico = ?`,
            [pending[0].token_verificacion, pending[0].token_expires_at, pending[0].ultimo_envio, normalizedEmail]
          );
        } catch (restoreError) {
          console.error(`[auth] No se pudo restaurar el registro pendiente (${restoreError.code || 'DB_ERROR'}).`);
        }
        return respondWithEmailError(res, emailError, true);
      }

      return res.status(200).json({ message: 'Se ha reenviado el correo de verificación.' });
    }

    if (!isEmailConfigured()) {
      return respondWithEmailError(res, { code: 'EMAIL_CONFIG_MISSING' });
    }

    // Primer registro
    const hashed = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await pool.query(
      `INSERT INTO pending_users 
      (correo_electronico, password, nombre, apellido, rol, direccion, token_verificacion, token_expires_at, ultimo_envio)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [normalizedEmail, hashed, String(nombre).trim(), apellido || null, 'cajero', direccion || null, hashToken(token), tokenExpiresAt]
    );

    try {
      await enviarCorreoVerificacion(normalizedEmail, nombre, token);
    } catch (emailError) {
      try {
        await pool.query('DELETE FROM pending_users WHERE correo_electronico = ?', [normalizedEmail]);
      } catch (cleanupError) {
        console.error(`[auth] No se pudo limpiar el registro pendiente (${cleanupError.code || 'DB_ERROR'}).`);
      }
      return respondWithEmailError(res, emailError);
    }

    await pool.query(
      'INSERT INTO activities (descripcion, usuario, tipo, detalles) VALUES (?, ?, ?, ?)',
      [`Registró una cuenta pendiente de verificación: ${nombre}`, nombre, 'usuario', `Cuenta: ${correo_electronico}`]
    );

    res.status(201).json({ message: 'Se ha enviado un correo de verificación. Por favor verifica tu cuenta.' });
  } catch (err) {
    console.error(`[auth] Error en registro (${err.code || 'UNKNOWN'}).`);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const forgotPassword = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const genericResponse = { message: 'Si existe una cuenta activa con ese correo, enviaremos instrucciones para restablecer la contraseña.' };
  try {
    const [users] = await pool.query('SELECT id, nombre FROM users WHERE correo_electronico = ? AND activo = 1 AND verificado = 1', [email]);
    if (!users.length || !isEmailConfigured()) return res.json(genericResponse);

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    const [previous] = await pool.query('SELECT reset_token, reset_token_expires FROM users WHERE id = ?', [users[0].id]);

    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [hashToken(token), expires, users[0].id]
    );

    try {
      await enviarCorreoRecuperacion(email, token, users[0].nombre);
    } catch (_emailError) {
      await pool.query('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [previous[0].reset_token, previous[0].reset_token_expires, users[0].id]);
    }
    return res.json(genericResponse);
  } catch (err) {
    console.error(`[auth] No se pudo procesar la recuperación (${err.code || 'UNKNOWN'}).`);
    return res.json(genericResponse);
  }
};

const verificarCuenta = async (req, res) => {
  const token = req.body.token;

  if (!token) {
    return res.status(400).json({ message: 'Token no proporcionado' });
  }

  try {
    // Buscar usuario pendiente por token (sin validar expiración todavía)
    const [tokenCheck] = await pool.query(
      'SELECT * FROM pending_users WHERE token_verificacion = ?',
      [hashToken(token)]
    );

    // Si no existe en absoluto
    if (!tokenCheck.length) {
      return res.status(400).json({ message: 'Token inválido o ya utilizado' });
    }

    const pendingUser = tokenCheck[0];

    // Si el token está expirado
    if (new Date(pendingUser.token_expires_at) < new Date()) {
      // 🔥 Eliminamos al usuario pendiente
      await pool.query('DELETE FROM pending_users WHERE id = ?', [pendingUser.id]);

      return res.status(400).json({ message: 'El token ha expirado. Por favor regístrate nuevamente.' });
    }

    // Verificamos que no exista ya en usuarios
    const [exists] = await pool.query(
      'SELECT * FROM users WHERE correo_electronico = ?',
      [pendingUser.correo_electronico]
    );

    if (exists.length > 0) {
      await pool.query('DELETE FROM pending_users WHERE id = ?', [pendingUser.id]);
      return res.status(400).json({ message: 'La cuenta ya fue activada' });
    }

    // Insertar usuario en la tabla final
    const [createdUser] = await pool.query(
  `INSERT INTO users (correo_electronico, password, nombre, apellido, rol, direccion, activo, verificado)
   VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
  [
    pendingUser.correo_electronico,
    pendingUser.password,
    pendingUser.nombre,
    pendingUser.apellido,
    pendingUser.rol,
    pendingUser.direccion
  ]
);


    await pool.query('DELETE FROM pending_users WHERE id = ?', [pendingUser.id]);

    await registrarActividad({
      userId: createdUser.insertId,
      tipo: 'usuario',
      descripcion: 'Verificó su cuenta'
    });

    res.json({ message: 'Tu cuenta ha sido verificada correctamente. Ahora puedes iniciar sesión.' });

  } catch (err) {
    console.error('Error en verificarCuenta:', err);
    res.status(500).json({ message: 'Error al verificar la cuenta' });
  }
};

const reenviarVerificacion = async (req, res) => {
  const { correo_electronico } = req.body;

  try {
    const [pendings] = await pool.query(
      'SELECT * FROM pending_users WHERE correo_electronico = ?',
      [correo_electronico]
    );

    if (!pendings.length) {
      return res.status(404).json({ message: 'No se encontró una cuenta pendiente con ese correo.' });
    }

    if (!isEmailConfigured()) {
      return respondWithEmailError(res, { code: 'EMAIL_CONFIG_MISSING' });
    }

    const newToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await pool.query(
      'UPDATE pending_users SET token_verificacion = ?, token_expires_at = ? WHERE id = ?',
      [hashToken(newToken), expiresAt, pendings[0].id]
    );

    try {
      await enviarCorreoVerificacion(correo_electronico, pendings[0].nombre, newToken);
    } catch (emailError) {
      try {
        await pool.query(
          'UPDATE pending_users SET token_verificacion = ?, token_expires_at = ? WHERE id = ?',
          [pendings[0].token_verificacion, pendings[0].token_expires_at, pendings[0].id]
        );
      } catch (restoreError) {
        console.error(`[auth] No se pudo restaurar el token de verificación (${restoreError.code || 'DB_ERROR'}).`);
      }
      return respondWithEmailError(res, emailError);
    }

    res.json({ message: 'Se ha reenviado el correo de verificación.' });
  } catch (err) {
    console.error(`[auth] Error al reenviar verificación (${err.code || 'UNKNOWN'}).`);
    res.status(500).json({ message: 'Error interno al reenviar verificación' });
  }
};


const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!isPasswordValid(password)) {
    return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [users] = await connection.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [hashToken(token)]
    );
    if (!users.length) {
      await connection.rollback();
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }

    const hashed = await bcrypt.hash(password, 10);

    await connection.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL, must_change_password = 0 WHERE id = ?',
      [hashed, users[0].id]
    );
    await connection.query('UPDATE sessions SET activo = 0 WHERE user_id = ?', [users[0].id]);
    await connection.commit();
    realtimeHub.disconnectUser(users[0].id, 'La contraseña se restableció. Inicia sesión nuevamente.');
    return res.json({ message: 'Contraseña restablecida correctamente' });
  } catch (err) {
    await connection.rollback();
    console.error(`[auth] Error al restablecer la contraseña (${err.code || 'UNKNOWN'}).`);
    return res.status(500).json({ message: 'Error al restablecer la contraseña' });
  } finally {
    connection.release();
  }
};

module.exports = {
  login,
  changeTemporaryPassword,
  register,
  forgotPassword,
  resetPassword,
  reenviarVerificacion, // <- asegúrate que esté así
  verificarCuenta, // <- asegúrate que esté así
};
