const express = require('express');
const router = express.Router();
const carritoController = require('../controllers/carritoController');
const { verifyToken } = require('../middleware/auth'); 

// Ruta para obtener ventas (PROTEGIDA)
router.get('/ventas', verifyToken, carritoController.getVentas);
router.post('/agregar', carritoController.agregarAlCarrito);
router.get('/:carritoId', carritoController.verCarrito);
router.delete('/:carritoId/producto/:productoId', carritoController.eliminarDelCarrito);
router.post('/procesar-venta', carritoController.procesarVenta);
// Endpoint para listar ventas (filtrado por periodo y por vendedor si aplica)
router.get('/ventas', carritoController.getVentas);
router.delete('/:carritoId/vaciar', carritoController.vaciarCarrito);
// Agrega esta ruta
router.get('/pedidos-cliente/:clienteId', async (req, res) => {
    try {
        const { clienteId } = req.params;
        
        // Obtener pedidos del cliente
        const [pedidos] = await db.execute(
            `SELECT 
                p.id_pedido,
                p.fecha,
                p.total,
                p.metodo_pago,
                p.estado,
                m.id_microempresa,
                m.nombre as empresa_nombre,
                m.nit as empresa_nit,
                m.direccion as empresa_direccion,
                m.telefono as empresa_telefono
            FROM pedido p
            JOIN microempresa m ON p.cliente_id = ?
            LEFT JOIN microempresa m ON p.cliente_id = ?
            WHERE p.cliente_id = ?
            ORDER BY p.fecha DESC`,
            [clienteId, clienteId, clienteId]
        );

        // Para cada pedido, obtener los detalles
        for (let pedido of pedidos) {
            const [detalles] = await db.execute(
                `SELECT 
                    dp.cantidad,
                    pr.nombre,
                    dp.precio_unitario
                FROM detalle_pedido dp
                JOIN producto pr ON dp.producto_id = pr.id_producto
                WHERE dp.pedido_id = ?`,
                [pedido.id_pedido]
            );
            pedido.productos = detalles;
        }

        res.json(pedidos);
    } catch (error) {
        console.error('Error obteniendo pedidos del cliente:', error);
        res.status(500).json({ error: 'Error al obtener pedidos' });
    }
});

module.exports = router;