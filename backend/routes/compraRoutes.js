const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const compraController = require('../controllers/compraController');

// Rutas específicas primero
router.get('/recientes', verifyToken, compraController.getComprasRecientes);
router.get('/estadisticas', verifyToken, compraController.getEstadisticasCompras);
router.get('/productos', verifyToken, compraController.getProductosParaCompra);

// Ruta para reporte
router.get('/:id/reporte', verifyToken, compraController.generarReporteCompra);

// Rutas generales
router.post('/', verifyToken, compraController.createCompra);
router.get('/', verifyToken, compraController.getCompras);
router.get('/:id', verifyToken, compraController.getCompraById);

module.exports = router;