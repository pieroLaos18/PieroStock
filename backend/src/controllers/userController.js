// controllers/userController.js

const userService = require('../services/userService');
const pool = require('../config/db');
const { cerrarSesion } = require('../services/sessionService');
const { registrarActividad } = require('../services/activityService');
const realtimeHub = require('../services/realtimeHub');

const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllActiveUsers();
    res.json(users);
  } catch (err) {
    console.error('❌ Error en getAllUsers:', err.message); // 👈 AÑADE ESTO
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

const getActiveUserCount = async (req, res) => {
  try {
    const count = await userService.countActiveUsers();
    res.json({ activos: count });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener usuarios activos' });
  }
};

const updateUserRole = async (req, res) => {
  const { role } = req.body;
  const { id } = req.params;
  if (!/^\d+$/.test(String(id)) || Number(id) <= 0) return res.status(400).json({ error: 'El identificador de usuario no es válido.' });
  if (!['admin', 'supervisor', 'cajero', 'almacenero'].includes(role)) {
    return res.status(400).json({ error: 'El rol indicado no es válido' });
  }
  try {
    const [[target]] = await pool.query('SELECT rol, activo FROM users WHERE id = ?', [id]);
    if (!target || Number(target.activo) !== 1) return res.status(404).json({ error: 'No se encontró el usuario activo.' });
    if (Number(id) === Number(req.user.id) && role !== target.rol) return res.status(409).json({ error: 'No puedes cambiar tu propio rol.' });
    if (target.rol === 'admin' && role !== 'admin') {
      const [[admins]] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE activo = 1 AND rol = 'admin'");
      if (Number(admins.total) <= 1) return res.status(409).json({ error: 'Debe permanecer al menos un administrador activo.' });
    }
    await userService.updateUserRole(id, role); // 👈 aquí el cambio
    await registrarActividad({ userId: req.user.id, tipo: 'usuario', descripcion: `Cambió el rol del usuario #${id}`, detalles: `Nuevo rol: ${role}` });
    realtimeHub.publishDataChanged({ entities: ['users'], action: 'user_role_changed', actorId: req.user.id, recordId: id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar el rol' });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(String(id)) || Number(id) <= 0) return res.status(400).json({ error: 'El identificador de usuario no es válido.' });
  if (Number(id) === Number(req.user.id)) return res.status(409).json({ error: 'No puedes desactivar tu propia cuenta.' });
  try {
    const [[target]] = await pool.query('SELECT rol, activo FROM users WHERE id = ?', [id]);
    if (!target || Number(target.activo) !== 1) return res.status(404).json({ error: 'No se encontró el usuario activo.' });
    if (target.rol === 'admin') {
      const [[admins]] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE activo = 1 AND rol = 'admin'");
      if (Number(admins.total) <= 1) return res.status(409).json({ error: 'Debe permanecer al menos un administrador activo.' });
    }
    await userService.deactivateUser(id);
    await registrarActividad({ userId: req.user.id, tipo: 'usuario', descripcion: `Desactivó el usuario #${id}` });
    realtimeHub.publishDataChanged({ entities: ['users'], action: 'user_deactivated', actorId: req.user.id, recordId: id });
    realtimeHub.disconnectUser(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al desactivar usuario' });
  }
};

const updateActivity = async (req, res) => {
  try {
    await userService.updateActivity(req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error al actualizar actividad del usuario:', err.message);
    res.status(500).json({ error: 'Error al actualizar actividad' });
  }
};

const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await cerrarSesion(token);
      realtimeHub.disconnectSession(token);
    }

    try {
      await registrarActividad({ userId: req.user.id, tipo: 'logout', descripcion: 'Cerró sesión' });
    } catch (activityError) {
      console.warn(`[users] No se pudo registrar el cierre de sesión (${activityError.code || 'UNKNOWN'}).`);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error en logout:', err.message);
    res.status(500).json({ error: 'Error al cerrar sesión' });
  }
};

const logoutInactiveUsers = async (req, res) => {
  try {
    await userService.logoutInactiveUsers();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al cerrar sesión de usuarios inactivos' });
  }
};

const isUserActive = async (req, res) => {
  const { id } = req.params;
  try {
    const active = await userService.isUserActive(id);
    if (active === null) return res.status(404).json({ active: false });
    res.json({ active });
  } catch (err) {
    res.status(500).json({ error: 'Error al verificar si el usuario está activo' });
  }
};

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { enviarCorreoContrasenaTemporal, isEmailConfigured } = require('../utils/emailSender');

const createUser = async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const role = String(req.body.role || '').trim().toLowerCase();
  const validRoles = ['admin', 'supervisor', 'cajero', 'almacenero'];

  if (!name || name.length > 100) return res.status(400).json({ message: 'El nombre es obligatorio y debe tener 100 caracteres o menos.' });
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Ingresa un correo electrónico válido.' });
  if (!validRoles.includes(role)) return res.status(400).json({ message: 'El rol indicado no es válido.' });
  if (!isEmailConfigured()) return res.status(503).json({ message: 'El correo del sistema no está configurado. No se creó la cuenta.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const temporaryPassword = `Tmp!${crypto.randomBytes(18).toString('hex')}`;
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    const [insertResult] = await conn.query(
      `INSERT INTO users (correo_electronico, password, nombre, rol, activo, verificado, must_change_password)
       VALUES (?, ?, ?, ?, 1, 1, 1)`,
      [email, hashedPassword, name, role]
    );
    await registrarActividad({
      userId: req.user.id,
      tipo: 'usuario',
      descripcion: `Creó la cuenta de ${name}`,
      detalles: `Correo: ${email} · Rol: ${role}`
    }, conn);
    try {
      await enviarCorreoContrasenaTemporal(email, name, temporaryPassword);
    } catch (emailError) {
      emailError.isEmailDeliveryError = true;
      throw emailError;
    }
    await conn.commit();
    realtimeHub.publishDataChanged({ entities: ['users', 'activities'], action: 'user_created', actorId: req.user.id, recordId: insertResult.insertId });
    return res.status(201).json({ id: insertResult.insertId, message: 'Usuario creado. Se envió una contraseña temporal al correo indicado.' });
  } catch (error) {
    await conn.rollback();
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ya existe una cuenta con ese correo electrónico.' });
    if (error.isEmailDeliveryError) {
      console.error(`[users] No se pudo enviar la contraseña temporal (${error.code || 'EMAIL_DELIVERY_FAILED'}).`);
      return res.status(503).json({ message: 'No se pudo enviar el correo. No se creó la cuenta; revisa la configuración de correo e inténtalo de nuevo.' });
    }
    console.error('Error al crear usuario:', error.message);
    return res.status(500).json({ message: 'No se pudo crear el usuario.' });
  } finally {
    conn.release();
  }
};

const verifyPassword = async (req, res) => {
  const { userId, password } = req.body;

  if (!Number.isSafeInteger(Number(userId)) || Number(userId) !== Number(req.user.id)) return res.status(403).json({ message: 'Solo puedes verificar tu propia contraseña.' });
  if (typeof password !== 'string' || password.length > 1024) return res.status(400).json({ message: 'La contraseña no es válida.' });

  try {
    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(password, rows[0].password);

    return res.json({ verified: isMatch });
  } catch (error) {
    console.error('❌ Error al verificar contraseña:', error.message);
    return res.status(500).json({ message: 'Error al verificar la contraseña' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    if (Number(id) !== Number(req.user.id) && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No puedes modificar el perfil de otra cuenta' });
    }
    if (!name || name.length > 100) return res.status(400).json({ message: 'El nombre es obligatorio y debe tener 100 caracteres o menos.' });
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Ingresa un correo electrónico válido.' });

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    await pool.query(
      'UPDATE users SET nombre = ?, correo_electronico = ?, imagen = COALESCE(?, imagen) WHERE id = ?',
      [name, email, imagePath, id]
    );
    const [[updatedUser]] = await pool.query('SELECT imagen FROM users WHERE id = ?', [id]);
    await registrarActividad({ userId: req.user.id, tipo: 'usuario', descripcion: 'Actualizó su perfil' });
    realtimeHub.publishDataChanged({ entities: ['users'], action: 'user_profile_updated', actorId: req.user.id, recordId: Number(id) });
    res.json({
      success: true,
      name,
      email,
      image: updatedUser?.imagen || null
    });

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ese correo ya está vinculado a otra cuenta.' });
    console.error('❌ Error al actualizar perfil:', err.message);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};


module.exports = {
  createUser,
  getAllUsers,
  getActiveUserCount,
  updateUserRole,
  deleteUser,
  updateActivity,
  logout,
  logoutInactiveUsers,
  isUserActive,
  verifyPassword,
  updateUserProfile,
};
