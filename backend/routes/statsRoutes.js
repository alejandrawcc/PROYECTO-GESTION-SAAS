const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// Importar el controlador correctamente
const statsController = require('../controllers/statsController');

// Ruta de prueba simple (sin autenticación primero)
router.get('/test', (req, res) => {
    res.json({ 
        message: 'Stats route working!',
        timestamp: new Date().toISOString()
    });
});

// Dashboard stats (con autenticación)
router.get('/dashboard', verifyToken, statsController.getDashboardStats);

// Debug endpoint (con autenticación)
router.get('/debug', verifyToken, statsController.debugVentas);

module.exports = router;