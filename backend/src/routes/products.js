const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorizeRole = require('../middleware/authorizeRole');
const upload = require('../middleware/upload');
const controller = require('../controllers/productController');
const pool = require('../config/db');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.getAll);
router.get('/destacados', authorizeRole('admin', 'supervisor'), controller.getDestacados);
router.get('/filter/:field/:value', controller.filterBy);
router.get('/:id/batches', authorizeRole('admin', 'supervisor', 'almacenero'), controller.getBatches);
router.post('/:id/receipts', authorizeRole('admin', 'supervisor', 'almacenero'), controller.receiveStock);
router.post('/', authorizeRole('admin', 'supervisor'), upload.single('image'), controller.add);
router.put('/:id', authorizeRole('admin', 'supervisor'), upload.single('image'), controller.update);
router.delete('/:id', authorizeRole('admin', 'supervisor'), controller.remove);

module.exports = router;
