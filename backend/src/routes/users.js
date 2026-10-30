// routes/users.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorizeRole = require('../middleware/authorizeRole');
const userController = require('../controllers/userController');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const imageTypes = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' };
const rateLimit = require('../middleware/rateLimit');
const passwordCheckLimiter = rateLimit({ name: 'password-check', windowMs: 15 * 60 * 1000, max: 5 });
const userCreationLimiter = rateLimit({ name: 'user-creation', windowMs: 60 * 60 * 1000, max: 20 });

// Configuración de multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `user_${Date.now()}_${crypto.randomBytes(5).toString('hex')}${imageTypes[file.mimetype]}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 10,
    parts: 11,
    fieldNameSize: 100,
    fieldSize: 10 * 1024,
    fieldNestingDepth: 5,
    fieldArrayIndexLimit: 20,
  },
  fileFilter: (_req, file, callback) => {
    if (!imageTypes[file.mimetype]) return callback(new Error('Usa una imagen JPG, PNG, GIF o WebP.'));
    callback(null, true);
  }
});

// Rutas
router.get('/', authenticate, authorizeRole('admin', 'supervisor'), userController.getAllUsers);
router.get('/activos', authenticate, authorizeRole('admin', 'supervisor'), userController.getActiveUserCount);
router.get('/stats/activos', authenticate, authorizeRole('admin', 'supervisor'), userController.getActiveUserCount);
router.post('/verify-password', passwordCheckLimiter, authenticate, userController.verifyPassword);
router.post('/', authenticate, authorizeRole('admin'), userCreationLimiter, userController.createUser);

router.put('/:id/profile', authenticate, upload.single('image'), userController.updateUserProfile); // ✅ SOLO ESTA

router.put('/:id', authenticate, authorizeRole('admin'), userController.updateUserRole);
router.delete('/:id', authenticate, authorizeRole('admin'), userController.deleteUser);
router.post('/activity', authenticate, userController.updateActivity);
router.post('/logout', authenticate, userController.logout);
router.post('/logout-inactivos', authenticate, authorizeRole('admin', 'supervisor'), userController.logoutInactiveUsers);
router.get('/:id/active', authenticate, authorizeRole('admin', 'supervisor'), userController.isUserActive);

module.exports = router;
