const express = require('express');
const authenticate = require('../middleware/authenticate');
const authorizeRole = require('../middleware/authorizeRole');
const { getSalesByDate } = require('../controllers/reportController');

const router = express.Router();

router.get('/by-date', authenticate, authorizeRole('admin', 'supervisor'), getSalesByDate);

module.exports = router;
