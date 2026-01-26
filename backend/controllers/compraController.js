const db = require('../config/db');

/**
 * ====================================================================
 * 1. CREAR NUEVA COMPRA
 * ====================================================================
 * Registra una compra, sus detalles, actualiza el stock y genera
 * el movimiento de inventario dentro de una TRANSACCIÓN (todo o nada).
 */


exports.createCompra = async (req, res) => {
    const { 
        proveedor_id, 
        id_proveedor, 
        numero_factura, 
        tipo_pago, 
        observaciones,
        productos = [] 
    } = req.body;
    
    const final_id_proveedor = id_proveedor || proveedor_id;
    const microempresa_id = req.user?.microempresa_id || req.user?.id_microempresa;
    const id_usuario = req.user?.id || req.user?.id_usuario;

    if (!final_id_proveedor || productos.length === 0) {
        return res.status(400).json({ error: "Faltan datos obligatorios (Proveedor o Productos)" });
    }

    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        // 1. Calcular Total
        const total = productos.reduce((sum, p) => sum + (parseFloat(p.cantidad) * parseFloat(p.precio_unitario)), 0);

        // 2. Insertar en tabla 'compra'
        const [resultCompra] = await connection.execute(
            `INSERT INTO compra 
            (microempresa_id, id_proveedor, id_usuario, total, numero_factura, tipo_pago, observaciones, estado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 'completada')`,
            [microempresa_id, final_id_proveedor, id_usuario, total, numero_factura || null, tipo_pago || 'Contado', observaciones || null]
        );

        const compraId = resultCompra.insertId;

        for (const producto of productos) {
            const subtotal = parseFloat(producto.cantidad) * parseFloat(producto.precio_unitario);

            // 3. Detalle de Compra
            await connection.execute(
                `INSERT INTO detalle_compra (id_compra, id_producto, id_proveedor, cantidad, precio_unitario, subtotal) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [compraId, producto.id_producto, final_id_proveedor, producto.cantidad, producto.precio_unitario, subtotal]
            );

            // 4. Actualizar stock en 'producto'
            await connection.execute(
                `UPDATE producto SET stock_actual = stock_actual + ?, fecha_actualizacion = NOW() 
                WHERE id_producto = ? AND microempresa_id = ?`,
                [producto.cantidad, producto.id_producto, microempresa_id]
            );

            // 5. Historial en 'inventario_movimiento'
            await connection.execute(
                `INSERT INTO inventario_movimiento (tipo, cantidad, id_producto, id_usuario, microempresa_id) 
                VALUES ('entrada', ?, ?, ?, ?)`,
                [producto.cantidad, producto.id_producto, id_usuario, microempresa_id]
            );
        }

        await connection.commit();
        res.status(201).json({ message: "✅ Compra y stock actualizados correctamente", id_compra: compraId });

    } catch (error) {
        await connection.rollback();
        console.error("❌ Error en transacción:", error.message);
        res.status(500).json({ error: "Error en el servidor", detalle: error.message });
    } finally {
        connection.release();
    }
};

/**
 * ====================================================================
 * 2. OBTENER LISTADO DE COMPRAS
 * ====================================================================
 * Filtra por fecha y proveedor. Incluye nombres mediante JOINS.
 */
exports.getCompras = async (req, res) => {
    const { microempresa_id } = req.user;
    const { fecha_inicio, fecha_fin, id_proveedor, busqueda } = req.query; // now supports search

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
            LEFT JOIN proveedor p ON c.id_proveedor = p.id_proveedor  -- Corregido JOIN
            LEFT JOIN usuario u ON c.id_usuario = u.id_usuario        -- Corregido JOIN
            LEFT JOIN detalle_compra dc ON c.id_compra = dc.id_compra
            WHERE c.microempresa_id = ?                               -- Corregido WHERE
        `;
        
        const params = [microempresa_id];

        // Filtros dinámicos
        if (fecha_inicio && fecha_fin) {
            query += ' AND DATE(c.fecha) BETWEEN ? AND ?';
            params.push(fecha_inicio, fecha_fin);
        }

        if (id_proveedor) {
            query += ' AND c.id_proveedor = ?';
            params.push(id_proveedor);
        }

        if (busqueda) {
            // Buscar por número de factura o nombre de proveedor
            query += ' AND (c.numero_factura LIKE ? OR p.nombre LIKE ?)';
            const like = `%${busqueda}%`;
            params.push(like, like);
        }

        query += ' GROUP BY c.id_compra ORDER BY c.fecha DESC';

        const [compras] = await db.execute(query, params);
        res.json(compras);
    } catch (error) {
        console.error("❌ Error obteniendo compras:", error);
        res.status(500).json({ error: "Error al obtener compras", details: error.message });
    }
};

/**
 * ====================================================================
 * 3. OBTENER DETALLE DE UNA COMPRA ESPECÍFICA
 * ====================================================================
 * Devuelve la cabecera, los items comprados y un resumen.
 */
exports.getCompraById = async (req, res) => {
    const { id } = req.params;
    const { microempresa_id } = req.user;

    try {
        console.log(`getCompraById called with params: ${JSON.stringify(req.params)} user: ${JSON.stringify(req.user && { id: req.user.id, microempresa_id: req.user.microempresa_id || req.user.id_microempresa })}`);
        // 1. Obtener cabecera
        const queryCabecera = `SELECT 
                c.*,
                p.nombre as proveedor_nombre,
                p.telefono as proveedor_telefono,
                p.email as proveedor_email,
                u.nombre as usuario_nombre,
                u.apellido as usuario_apellido
            FROM compra c
            LEFT JOIN proveedor p ON c.id_proveedor = p.id_proveedor
            LEFT JOIN usuario u ON c.id_usuario = u.id_usuario
            WHERE c.id_compra = ? AND c.microempresa_id = ?`;
        console.log('Executing cabecera query:', queryCabecera, 'params:', [id, microempresa_id]);
        const [compras] = await db.execute(queryCabecera, [id, microempresa_id]);
        console.log('Cabecera rows:', compras.length);

        if (compras.length === 0) {
            console.warn(`Compra no encontrada: id=${id}, microempresa_id=${microempresa_id}`);
            return res.status(404).json({ message: "Compra no encontrada" });
        }

        // 2. Obtener productos (items)
        const queryDetalles = `SELECT 
                dc.*,
                pr.nombre as producto_nombre,
                pr.stock_actual,
                pr.precio as precio_actual
            FROM detalle_compra dc
            JOIN producto pr ON dc.id_producto = pr.id_producto
            WHERE dc.id_compra = ?
            ORDER BY dc.id_detalle_compra`;
        console.log('Executing detalles query:', queryDetalles, 'params:', [id]);
        const [detalles] = await db.execute(queryDetalles, [id]);
        console.log('Detalles rows:', detalles.length);

        res.json({
            compra: compras[0],
            detalles: detalles,
            resumen: {
                total_productos: detalles.length,
                total_unidades: detalles.reduce((sum, d) => sum + d.cantidad, 0)
            }
        });
    } catch (error) {
        console.error("❌ Error obteniendo detalle de compra:", error.stack || error);
        res.status(500).json({ error: "Error al obtener detalle de compra", details: error.message });
    }
};

/**
 * ====================================================================
 * 4. ESTADÍSTICAS DE COMPRAS (DASHBOARD)
 * ====================================================================
 * Calcula totales filtrando por día, semana, mes o año.
 */
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
            WHERE c.microempresa_id = ? ${filtroFecha}`, // Corregido
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

/**
 * ====================================================================
 * 5. COMPRAS RECIENTES (WIDGET)
 * ====================================================================
 * Devuelve las últimas 10 compras para el dashboard principal.
 */
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
            LEFT JOIN proveedor p ON c.id_proveedor = p.id_proveedor  -- Corregido
            LEFT JOIN detalle_compra dc ON c.id_compra = dc.id_compra
            WHERE c.microempresa_id = ?                               -- Corregido
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

/**
 * ====================================================================
 * 6. PRODUCTOS DISPONIBLES PARA COMPRA
 * ====================================================================
 * Lista simple para llenar el select/buscador al crear una compra.
 */
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

const PDFDocument = require('pdfkit');

/**
 * ====================================================================
 * 7. gGENERAR REPOSTES DE COMPRA
 * ====================================================================
 */

exports.generarPDFCompra = async (req, res) => {
    const { id } = req.params;
    const microempresa_id = req.user.microempresa_id;

    try {
        // 1. Obtener datos de la compra y proveedor
        const [compra] = await db.execute(
            `SELECT c.*, p.nombre as proveedor_nombre, p.direccion, p.telefono 
             FROM compra c 
             JOIN proveedor p ON c.id_proveedor = p.id_proveedor 
             WHERE c.id_compra = ? AND c.microempresa_id = ?`,
            [id, microempresa_id]
        );

        if (compra.length === 0) return res.status(404).json({ error: "Compra no encontrada" });

        // 2. Obtener detalles de productos
        const [productos] = await db.execute(
            `SELECT dc.*, prod.nombre 
             FROM detalle_compra dc 
             JOIN producto prod ON dc.id_producto = prod.id_producto 
             WHERE dc.id_compra = ?`,
            [id]
        );

        // 3. Crear el PDF
        const doc = new PDFDocument({ margin: 50 });
        
        // Configurar respuesta del navegador
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=compra_${id}.pdf`);
        doc.pipe(res);

        // --- DISEÑO DEL PDF ---
        doc.fontSize(20).text('REPORTE DE COMPRA', { align: 'center' }).moveDown();
        
        doc.fontSize(12).text(`Factura N°: ${compra[0].numero_factura || 'S/N'}`);
        doc.text(`Fecha: ${new Date(compra[0].fecha).toLocaleString()}`);
        doc.text(`Proveedor: ${compra[0].proveedor_nombre}`);
        doc.text(`Método de Pago: ${compra[0].tipo_pago}`).moveDown();

        // Tabla de productos
        doc.fontSize(14).text('Detalle de Productos:', { underline: true }).moveDown(0.5);
        
        productos.forEach(p => {
            doc.fontSize(10).text(
                `${p.nombre} - Cant: ${p.cantidad} x Bs. ${p.precio_unitario} = Bs. ${p.subtotal}`
            );
        });

        doc.moveDown().fontSize(14).text(`TOTAL: Bs. ${compra[0].total}`, { align: 'right' });

        doc.end();

    } catch (error) {
        console.error("Error PDF:", error);
        res.status(500).json({ error: "Error al generar el PDF" });
    }
};