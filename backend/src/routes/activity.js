const express = require('express');
const pool = require('../config/db');
const authenticate = require('../middleware/authenticate');
const authorizeRole = require('../middleware/authorizeRole');

const router = express.Router();
router.use(authenticate, authorizeRole('admin', 'supervisor'));

const readActivities = async (req, res, next) => {
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 500)
    : 500;
  try {
    const [rows] = await pool.query(
      `SELECT id, descripcion, fecha, usuario, tipo, detalles
       FROM activities ORDER BY fecha DESC, id DESC LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

router.get('/', readActivities);
router.get('/ultimas', readActivities);
router.get('/recientes', readActivities);

module.exports = router;
