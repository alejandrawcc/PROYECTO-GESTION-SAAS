const db = require('../config/db');

// 1. CREAR NUEVA COMPRA
exports.createCompra = async (req, res) => {
    const { 
        proveedor_id, 
        numero_factura, 
        tipo_pago, 
        observaciones,
        productos // Array de productos: [{id_producto, cantidad, precio_unitario}]
    } = req.body;
    
    const { microempresa_id, id: usuario_id } = req.user;

    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        // Calcular total
        const total = productos.reduce((sum, producto) => {
            return sum + (parseFloat(producto.cantidad) * parseFloat(producto.precio_unitario));
        }, 0);

        // Insertar compra
        const [resultCompra] = await connection.execute(
            `INSERT INTO compra 
            (id_microempresa, proveedor_id, numero_factura, total, tipo_pago, observaciones, usuario_id, estado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'completada')`,
            [microempresa_id, proveedor_id, numero_factura, total, tipo_pago, observaciones, usuario_id]
        );

        const compraId = resultCompra.insertId;

        // Insertar detalles y actualizar stock
        for (const producto of productos) {
            // Detalle de compra
            await connection.execute(
                `INSERT INTO detalle_compra 
                (id_compra, id_producto, id_proveedor, cantidad, precio_unitario, subtotal) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    compraId,
                    producto.id_producto,
                    proveedor_id,
                    producto.cantidad,
                    producto.precio_unitario,
                    producto.cantidad * producto.precio_unitario
                ]
            );

            // Actualizar stock del producto
            await connection.execute(
                `UPDATE producto 
                SET stock_actual = stock_actual + ?, 
                    fecha_actualizacion = NOW(),
                    visible_portal = CASE 
                        WHEN (stock_actual + ?) > 0 THEN 1 
                        ELSE 0 
                    END
                WHERE id_producto = ? AND microempresa_id = ?`,
                [producto.cantidad, producto.cantidad, producto.id_producto, microempresa_id]
            );

            // Movimiento de inventario
            await connection.execute(
                `INSERT INTO inventario_movimiento 
                (tipo, cantidad, fecha, producto_id, usuario_id, microempresa_id) 
                VALUES ('entrada', ?, NOW(), ?, ?, ?)`,
                [producto.cantidad, producto.id_producto, usuario_id, microempresa_id]
            );
        }

        await connection.commit();

        res.status(201).json({
            message: "✅ Compra registrada exitosamente",
            compra_id: compraId,
            total: total,
            productos_actualizados: productos.length
        });

    } catch (error) {
        await connection.rollback();
        console.error("❌ Error registrando compra:", error);
        res.status(500).json({ 
            error: "Error al registrar la compra",
            details: error.message 
        });
    } finally {
        connection.release();
    }
};

// 2. OBTENER COMPRAS
exports.getCompras = async (req, res) => {
    const { microempresa_id } = req.user;
    const { fecha_inicio, fecha_fin, proveedor_id } = req.query;

    try {
        let query = `
            SELECT 
                c.id_compra,
                c.fecha,
                c.total,
                c.numero_factura,
                c.tipo_pago,
                c.estado,
                p.nombre as proveedor_nombre,
                p.telefono as proveedor_telefono,
                u.nombre as usuario_nombre,
                COUNT(dc.id_detalle_compra) as total_productos
            FROM compra c
            LEFT JOIN proveedor p ON c.proveedor_id = p.id_proveedor
            LEFT JOIN usuario u ON c.usuario_id = u.id_usuario
            LEFT JOIN detalle_compra dc ON c.id_compra = dc.id_compra
            WHERE c.id_microempresa = ?
        `;
        
        const params = [microempresa_id];

        if (fecha_inicio && fecha_fin) {
            query += ' AND DATE(c.fecha) BETWEEN ? AND ?';
            params.push(fecha_inicio, fecha_fin);
        }

        if (proveedor_id) {
            query += ' AND c.proveedor_id = ?';
            params.push(proveedor_id);
        }

        query += ' GROUP BY c.id_compra ORDER BY c.fecha DESC';

        const [compras] = await db.execute(query, params);
        res.json(compras);
    } catch (error) {
        console.error("❌ Error obteniendo compras:", error);
        res.status(500).json({ error: "Error al obtener compras" });
    }
};

// 3. OBTENER DETALLE DE COMPRA
exports.getCompraById = async (req, res) => {
    const { id } = req.params;
    const { microempresa_id } = req.user;

    try {
        const [compras] = await db.execute(
            `SELECT 
                c.*,
                p.nombre as proveedor_nombre,
                p.telefono as proveedor_telefono,
                p.email as proveedor_email,
                u.nombre as usuario_nombre,
                u.apellido as usuario_apellido
            FROM compra c
            LEFT JOIN proveedor p ON c.proveedor_id = p.id_proveedor
            LEFT JOIN usuario u ON c.usuario_id = u.id_usuario
            WHERE c.id_compra = ? AND c.id_microempresa = ?`,
            [id, microempresa_id]
        );

        if (compras.length === 0) {
            return res.status(404).json({ message: "Compra no encontrada" });
        }

        const [detalles] = await db.execute(
            `SELECT 
                dc.*,
                pr.nombre as producto_nombre,
                pr.stock_actual,
                pr.precio as precio_actual
            FROM detalle_compra dc
            JOIN producto pr ON dc.id_producto = pr.id_producto
            WHERE dc.id_compra = ?
            ORDER BY dc.id_detalle_compra`,
            [id]
        );

        res.json({
            compra: compras[0],
            detalles: detalles,
            resumen: {
                total_productos: detalles.length,
                total_unidades: detalles.reduce((sum, d) => sum + d.cantidad, 0)
            }
        });
    } catch (error) {
        console.error("❌ Error obteniendo detalle de compra:", error);
        res.status(500).json({ error: "Error al obtener detalle de compra" });
    }
};

// 4. ESTADÍSTICAS DE COMPRAS
exports.getEstadisticasCompras = async (req, res) => {
    const { microempresa_id } = req.user;
    const { periodo } = req.query;

    try {
        let filtroFecha = '';
        switch (periodo) {
            case 'hoy':
                filtroFecha = 'AND DATE(c.fecha) = CURDATE()';
                break;
            case 'semana':
                filtroFecha = 'AND YEARWEEK(c.fecha, 1) = YEARWEEK(CURDATE(), 1)';
                break;
            case 'mes':
                filtroFecha = 'AND MONTH(c.fecha) = MONTH(CURDATE()) AND YEAR(c.fecha) = YEAR(CURDATE())';
                break;
            case 'anio':
                filtroFecha = 'AND YEAR(c.fecha) = YEAR(CURDATE())';
                break;
            default:
                filtroFecha = 'AND MONTH(c.fecha) = MONTH(CURDATE())';
        }

        const [totalCompra] = await db.execute(
            `SELECT 
                COALESCE(SUM(total), 0) as total,
                COUNT(*) as cantidad_compras
            FROM compra c
            WHERE c.id_microempresa = ? ${filtroFecha}`,
            [microempresa_id]
        );

        res.json({
            periodo: periodo || 'mes',
            total: totalCompra[0],
            resumen: {
                total_comprado: totalCompra[0].total || 0,
                cantidad_compras: totalCompra[0].cantidad_compras || 0,
                promedio_compra: totalCompra[0].total && totalCompra[0].cantidad_compras ? 
                    (totalCompra[0].total / totalCompra[0].cantidad_compras).toFixed(2) : 0
            }
        });
    } catch (error) {
        console.error("❌ Error obteniendo estadísticas:", error);
        res.status(500).json({ error: "Error al obtener estadísticas" });
    }
};

// 5. COMPRAS RECIENTES
exports.getComprasRecientes = async (req, res) => {
    const { microempresa_id } = req.user;

    try {
        const [compras] = await db.execute(
            `SELECT 
                c.id_compra,
                c.fecha,
                c.total,
                c.numero_factura,
                p.nombre as proveedor_nombre,
                COUNT(dc.id_detalle_compra) as total_productos
            FROM compra c
            LEFT JOIN proveedor p ON c.proveedor_id = p.id_proveedor
            LEFT JOIN detalle_compra dc ON c.id_compra = dc.id_compra
            WHERE c.id_microempresa = ?
            GROUP BY c.id_compra
            ORDER BY c.fecha DESC
            LIMIT 10`,
            [microempresa_id]
        );
        
        res.json(compras);
    } catch (error) {
        console.error("❌ Error obteniendo compras recientes:", error);
        res.status(500).json({ error: "Error al obtener compras recientes" });
    }
};

// 6. PRODUCTOS PARA COMPRA
exports.getProductosParaCompra = async (req, res) => {
    const { microempresa_id } = req.user;

    try {
        const [productos] = await db.execute(
            `SELECT 
                p.id_producto,
                p.nombre,
                p.descripcion,
                p.stock_actual,
                p.stock_minimo,
                p.precio as precio_actual
            FROM producto p
            WHERE p.microempresa_id = ? AND p.estado = 'stock'
            ORDER BY p.nombre ASC`,
            [microempresa_id]
        );
        
        res.json(productos);
    } catch (error) {
        console.error("❌ Error obteniendo productos:", error);
        res.status(500).json({ error: "Error al obtener productos" });
    }
};