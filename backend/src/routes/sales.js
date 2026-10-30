// routes/salesRoutes.js

const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const authenticate = require('../middleware/authenticate');
const authorizeRole = require('../middleware/authorizeRole');

router.use(authenticate);

router.get('/', authorizeRole('admin', 'supervisor', 'cajero'), salesController.getAllSales);
router.get('/resumen', authorizeRole('admin', 'supervisor'), salesController.getSalesResumen);
router.get('/ventas-por-dia', authorizeRole('admin', 'supervisor'), salesController.getVentasPorDia);
router.get('/ventas-por-dia-anterior', authorizeRole('admin', 'supervisor'), salesController.getVentasPorDiaAnterior);
router.get('/metodos-pago', authorizeRole('admin', 'supervisor'), salesController.getMetodosPago);
router.get('/top-products', authorizeRole('admin', 'supervisor'), salesController.getTopProducts);
router.get('/dashboard-insights', authorizeRole('admin', 'supervisor'), salesController.getDashboardInsights);
router.get('/comprobante/:id', authorizeRole('admin', 'supervisor', 'cajero'), salesController.generarComprobante);
router.get('/:id', authorizeRole('admin', 'supervisor', 'cajero'), salesController.getVentaById);

// Rutas protegidas
router.post('/', authorizeRole('admin', 'supervisor', 'cajero'), salesController.createVenta);
router.put('/anular/:id', authorizeRole('admin', 'supervisor'), salesController.anularVenta);

module.exports = router;
