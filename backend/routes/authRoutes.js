const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// Rutas públicas
router.post('/register', authController.registrar);
router.post('/login', authController.login);
router.get('/microempresas', authController.getMicroempresas);

// Ruta protegida para verificar token
router.get('/verify', verifyToken, authController.verifyToken);

// Ruta para cerrar sesión
router.post('/logout', verifyToken, authController.logout);

module.exports = router;