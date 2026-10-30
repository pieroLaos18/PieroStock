const express = require('express');
const { login, register, forgotPassword, resetPassword } = require('../controllers/authController');
const { body, validationResult } = require('express-validator');
const validateFields = require('../middlewares/validateFields');
const { PASSWORD_PATTERN, PASSWORD_POLICY_MESSAGE } = require('../utils/passwordPolicy');

const router = express.Router();

router.post('/login', login);

router.post(
  '/register',
  [
    body('correo_electronico').isEmail().withMessage('Correo electrónico inválido'),
    body('password').isString().withMessage(PASSWORD_POLICY_MESSAGE).bail().matches(PASSWORD_PATTERN).withMessage(PASSWORD_POLICY_MESSAGE),
    body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
    validateFields
  ],
  register
);

router.post('/forgot-password', forgotPassword);
router.post(
  '/reset-password/:token',
  [
    body('password').isString().withMessage(PASSWORD_POLICY_MESSAGE).bail().matches(PASSWORD_PATTERN).withMessage(PASSWORD_POLICY_MESSAGE),
    validateFields
  ],
  resetPassword
);

module.exports = router;
