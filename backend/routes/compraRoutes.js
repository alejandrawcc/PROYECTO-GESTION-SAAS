const express = require('express');
const router = express.Router();
const compraController = require('../controllers/compraController');
const { verifyToken } = require('../middleware/auth');

// Rutas protegidas
router.post('/', verifyToken, compraController.createCompra);
router.get('/', verifyToken, compraController.getCompras);
router.get('/estadisticas', verifyToken, compraController.getEstadisticasCompras);
router.get('/recientes', verifyToken, compraController.getComprasRecientes);
router.get('/productos', verifyToken, compraController.getProductosParaCompra);
router.get('/:id', verifyToken, compraController.getCompraById);

module.exports = router;