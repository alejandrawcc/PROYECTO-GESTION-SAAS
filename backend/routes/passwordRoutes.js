const express = require('express');
const router = express.Router();
const passwordController = require('../controllers/passwordController');

// Ruta para solicitar reset de contraseña
router.post('/forgot-password', passwordController.requestPasswordReset);

// Ruta para verificar token de reset
router.get('/verify-reset-token/:token', passwordController.verifyResetToken);

// Ruta para resetear contraseña
router.post('/reset-password', passwordController.resetPassword);

module.exports = router;