const express = require('express');
const router = express.Router();
const carritoController = require('../controllers/carritoController');

// Rutas del carrito
router.post('/agregar', carritoController.agregarAlCarrito);
router.get('/:carritoId', carritoController.verCarrito);
router.delete('/:carritoId/producto/:productoId', carritoController.eliminarDelCarrito);
router.post('/procesar-venta', carritoController.procesarVenta);
router.delete('/:carritoId/vaciar', carritoController.vaciarCarrito);

module.exports = router;