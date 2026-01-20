const express = require('express');
const router = express.Router();
const suscripcionController = require('../controllers/suscripcionController');
const { verifyToken } = require('../middleware/auth');

router.post('/cambiar', verifyToken, suscripcionController.cambiarPlan);

module.exports = router;
