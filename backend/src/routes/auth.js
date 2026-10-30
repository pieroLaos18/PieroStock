const express = require('express');
const { body, param } = require('express-validator');
const validateFields = require('../middleware/validateFields');
const authenticate = require('../middleware/authenticate');
const { PASSWORD_PATTERN, PASSWORD_POLICY_MESSAGE } = require('../utils/passwordPolicy');
const rateLimit = require('../middleware/rateLimit');
const loginLimiter = rateLimit({ name: 'login', windowMs: 15 * 60 * 1000, max: 10 });
const registrationLimiter = rateLimit({ name: 'register', windowMs: 60 * 60 * 1000, max: 5 });
const recoveryLimiter = rateLimit({ name: 'recovery', windowMs: 60 * 60 * 1000, max: 5 });

const {
  login,
  changeTemporaryPassword,
  register,
  forgotPassword,
  resetPassword,
  verificarCuenta,
  reenviarVerificacion
} = require('../controllers/authController');

const router = express.Router();

router.post('/login', loginLimiter, [
  body('correo_electronico').isEmail().withMessage('Ingresa un correo válido.').bail().trim().customSanitizer(value => value.toLowerCase()),
  body('password').isString().isLength({ min: 1, max: 1024 }).withMessage('Las credenciales no son válidas.'),
  validateFields
], login);
router.post('/change-temporary-password', authenticate, [
  body('password').isString().isLength({ min: 8, max: 1024 }).matches(PASSWORD_PATTERN).withMessage(PASSWORD_POLICY_MESSAGE),
  validateFields
], changeTemporaryPassword);

router.post(
  '/register',
  [registrationLimiter,
    body('correo_electronico').isEmail().withMessage('Correo electrónico inválido').bail().trim().customSanitizer(value => value.toLowerCase()),
    body('password').isString().isLength({ min: 8, max: 1024 }).matches(PASSWORD_PATTERN).withMessage(PASSWORD_POLICY_MESSAGE),
    body('nombre').trim().isLength({ min: 1, max: 100 }).withMessage('El nombre es obligatorio (máximo 100 caracteres).'),
    validateFields
  ],
  register
);

// ✅ Ruta para verificación de cuenta por token
router.post('/verificar', recoveryLimiter, body('token').isString().isLength({ min: 64, max: 256 }), validateFields, verificarCuenta);
router.post('/reenviar-verificacion', recoveryLimiter, body('correo_electronico').isEmail().bail().trim().customSanitizer(value => value.toLowerCase()), validateFields, reenviarVerificacion);

router.post('/forgot-password', recoveryLimiter, body('email').isEmail().bail().trim().customSanitizer(value => value.toLowerCase()), validateFields, forgotPassword);
router.post(
  '/reset-password/:token',
  [recoveryLimiter,
    param('token').matches(/^[a-f0-9]{64}$/i).withMessage('Token inválido.'),
    body('password').isString().isLength({ min: 8, max: 1024 }).matches(PASSWORD_PATTERN).withMessage(PASSWORD_POLICY_MESSAGE),
    validateFields
  ],
  resetPassword
);

module.exports = router;
