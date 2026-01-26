const express = require('express');
const router = express.Router();
const compraController = require('../controllers/compraController');
const { verifyToken } = require('../middleware/auth');

// Rutas protegidas
router.post('/', verifyToken, compraController.createCompra);
// Carrito de compras (temporal)
const carritoCompraController = require('../controllers/carritoCompraController');
router.post('/carrito/agregar', verifyToken, carritoCompraController.agregarAlCarritoCompra);
router.get('/carrito/:carritoId', verifyToken, carritoCompraController.verCarritoCompra);
router.delete('/carrito/:carritoId/producto/:productoId', verifyToken, carritoCompraController.eliminarDelCarritoCompra);
router.delete('/carrito/:carritoId/vaciar', verifyToken, carritoCompraController.vaciarCarritoCompra);
router.post('/carrito/procesar', verifyToken, carritoCompraController.procesarCompra);
router.get('/', verifyToken, compraController.getCompras);
router.get('/estadisticas', verifyToken, compraController.getEstadisticasCompras);
router.get('/recientes', verifyToken, compraController.getComprasRecientes);
router.get('/productos', verifyToken, compraController.getProductosParaCompra);
router.get('/:id', verifyToken, compraController.getCompraById);
//Para generar pdf
router.get('/:id/reporte', verifyToken, compraController.generarPDFCompra);

module.exports = router;