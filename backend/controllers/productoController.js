const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// Crear producto con imagen
exports.createProducto = async (req, res) => {
    let { nombre, descripcion, stock_actual, categoria, stock_minimo } = req.body;
    // aceptar `precio` o `precio_actual` desde el frontend
    let precio = req.body.precio !== undefined ? req.body.precio : req.body.precio_actual;
    const { microempresa_id } = req.user;

    // Validaciones y normalizaciones para evitar parámetros undefined en SQL
    if (!nombre || nombre.toString().trim() === '') {
        return res.status(400).json({ error: 'El nombre del producto es requerido' });
    }

    precio = precio !== undefined && precio !== null && precio !== '' ? parseFloat(precio) : 0;
    stock_actual = stock_actual !== undefined && stock_actual !== null && stock_actual !== '' ? parseInt(stock_actual) : 0;
    categoria = categoria !== undefined && categoria !== null && categoria !== '' ? categoria : null;
    stock_minimo = stock_minimo !== undefined && stock_minimo !== null && stock_minimo !== '' ? parseInt(stock_minimo) : 5;
    descripcion = descripcion !== undefined && descripcion !== null && descripcion !== '' ? descripcion : null;

    // Determinar si será visible en el portal
    const visible_portal = stock_actual > 0 ? 1 : 0;

    try {
        let imagen_url = null;
        
        // Si hay imagen, guardarla
        if (req.file) {
            imagen_url = req.file.filename;
        }

        // Insertar producto
        const [result] = await db.execute(
            `INSERT INTO producto 
            (nombre, descripcion, precio, stock_actual, categoria, microempresa_id, 
            estado, visible_portal, stock_minimo, imagen_url) 
            VALUES (?, ?, ?, ?, ?, ?, 'stock', ?, ?, ?)`,
            [nombre, descripcion, precio, stock_actual, categoria, microempresa_id, 
            visible_portal, stock_minimo || 5, imagen_url]
        );

        const productoId = result.insertId;

        // Crear notificación si stock es 0
        if (stock_actual === 0) {
            await db.execute(
                `INSERT INTO notificacion_stock 
                (producto_id, microempresa_id, tipo, mensaje) 
                VALUES (?, ?, 'agotado', ?)`,
                [productoId, microempresa_id, `⚠️ Producto "${nombre}" está agotado`]
            );
        }

        res.status(201).json({ 
            message: "✅ Producto creado exitosamente",
            producto_id: productoId,
            visible_en_portal: visible_portal === 1,
            imagen_url: imagen_url
        });
    } catch (error) {
        console.error("❌ Error creando producto:", error);
        res.status(500).json({ 
            error: "Error al crear producto",
            details: error.message 
        });
    }
};

// Obtener productos por empresa (admin)
exports.getProductosByEmpresa = async (req, res) => {
    const { microempresa_id } = req.user;
    const { conStock, categoria } = req.query;

    try {
        let query = `
            SELECT p.* 
            FROM producto p
            WHERE p.microempresa_id = ?
        `;

        const params = [microempresa_id];

        if (conStock === 'true') {
            query += ' AND p.stock_actual > 0';
        } else if (conStock === 'false') {
            query += ' AND p.stock_actual = 0';
        }

        if (categoria && categoria !== 'todas') {
            query += ' AND p.categoria = ?';
            params.push(categoria);
        }

        query += ' ORDER BY p.fecha_actualizacion DESC';

        const [productos] = await db.execute(query, params);
        
        res.json(productos);
    } catch (error) {
        console.error("Error obteniendo productos:", error);
        res.status(500).json({ error: "Error al obtener productos" });
    }
};

// Obtener productos para el portal (público)
exports.getProductosPublic = async (req, res) => {
    const { microempresaId } = req.params;
    const { categoria } = req.query;

    try {
        let query = `
            SELECT p.*
            FROM producto p
            WHERE p.microempresa_id = ? 
            AND p.visible_portal = 1
            AND p.stock_actual > 0
            AND p.estado = 'stock'
        `;

        const params = [microempresaId];

        if (categoria && categoria !== 'todas') {
            query += ' AND p.categoria = ?';
            params.push(categoria);
        }

        query += ' ORDER BY p.fecha_actualizacion DESC';

        const [productos] = await db.execute(query, params);
        
        res.json(productos);
    } catch (error) {
        console.error("Error obteniendo productos públicos:", error);
        res.status(500).json({ error: "Error al obtener productos" });
    }
};

// Actualizar stock y visibilidad
exports.updateStock = async (req, res) => {
    const { id } = req.params;
    const { nuevoStock } = req.body;
    const { microempresa_id } = req.user;

    try {
        const visible_portal = nuevoStock > 0 ? 1 : 0;

        await db.execute(
            'UPDATE producto SET stock_actual = ?, visible_portal = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_producto = ? AND microempresa_id = ?',
            [nuevoStock, visible_portal, id, microempresa_id]
        );

        // Si stock es 0, crear notificación
        if (nuevoStock === 0) {
            const [producto] = await db.execute(
                'SELECT nombre FROM producto WHERE id_producto = ?',
                [id]
            );

            if (producto.length > 0) {
                await db.execute(
                    `INSERT INTO notificacion_stock 
                    (producto_id, microempresa_id, tipo, mensaje) 
                    VALUES (?, ?, 'agotado', ?)`,
                    [id, microempresa_id, `⚠️ Producto "${producto[0].nombre}" está agotado`]
                );
            }
        }

        res.json({ 
            message: "✅ Stock actualizado exitosamente",
            visible_en_portal: visible_portal === 1
        });
    } catch (error) {
        console.error("Error actualizando stock:", error);
        res.status(500).json({ error: "Error al actualizar stock" });
    }
};

// Actualizar producto
// Reemplazar la función updateProducto completa con esta versión corregida:
exports.updateProducto = async (req, res) => {
    try {
        const { microempresa_id } = req.user;
        const { id } = req.params;
        
        // Obtener datos del body (si viene como FormData, algunos campos pueden estar en req.body)
        const { nombre, descripcion, precio, categoria, stock_minimo } = req.body;
        
        console.log("📝 Datos recibidos para actualizar:", {
            id, microempresa_id, nombre, precio, categoria
        });
        
        if (!nombre || !precio) {
            return res.status(400).json({ 
                success: false,
                message: "Nombre y precio son requeridos" 
            });
        }
        
        // Preparar los valores para la actualización
        let imagen_url = null;
        if (req.file) {
            imagen_url = req.file.filename;
            
            // Obtener imagen anterior para eliminarla
            const [productoAnterior] = await db.execute(
                'SELECT imagen_url FROM producto WHERE id_producto = ? AND microempresa_id = ?',
                [id, microempresa_id]
            );
            
            if (productoAnterior.length > 0 && productoAnterior[0].imagen_url) {
                const oldImagePath = path.join(__dirname, '..', 'uploads', 'productos', productoAnterior[0].imagen_url);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        }
        
        // Construir la consulta dinámicamente
        let query = 'UPDATE producto SET nombre = ?, descripcion = ?, precio = ?, categoria = ?, stock_minimo = ?';
        let params = [nombre, descripcion, precio, categoria || null, stock_minimo || 5];
        
        if (imagen_url) {
            query += ', imagen_url = ?';
            params.push(imagen_url);
        }
        
        query += ', fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_producto = ? AND microempresa_id = ?';
        params.push(id, microempresa_id);
        
        // Ejecutar la actualización
        const [result] = await db.execute(query, params);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                message: "Producto no encontrado o no tienes permiso" 
            });
        }
        
        res.json({ 
            success: true,
            message: "Producto actualizado exitosamente",
            data: {
                id: parseInt(id),
                nombre,
                precio: parseFloat(precio),
                categoria,
                imagen_url
            }
        });
        
    } catch (error) {
        console.error("❌ Error en updateProducto:", error);
        console.error("SQL Error:", error.sqlMessage);
        
        res.status(500).json({ 
            success: false,
            error: "Error interno del servidor",
            message: error.message,
            sqlError: error.sqlMessage
        });
    }
};

// Eliminar producto
exports.deleteProducto = async (req, res) => {
    const { id } = req.params;
    const { microempresa_id } = req.user;

    try {
        // 1. Primero, eliminar las notificaciones relacionadas CON esta nueva línea
        await db.execute(
            'DELETE FROM notificacion_stock WHERE producto_id = ?',
            [id]
        );

        // 2. Obtener imagen para eliminarla
        const [producto] = await db.execute(
            'SELECT imagen_url FROM producto WHERE id_producto = ? AND microempresa_id = ?',
            [id, microempresa_id]
        );

        if (producto.length === 0) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        // 3. Eliminar imagen si existe
        if (producto[0].imagen_url) {
            const imagePath = path.join(__dirname, '..', 'uploads', 'productos', producto[0].imagen_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // 4. También eliminar registros en otras tablas que puedan referenciar el producto
        // (Verifica tu base de datos para otras posibles referencias)
        
        // Posibles tablas que podrían referenciar producto_id:
        // - detalle_pedido
        // - detalle_compra
        // - inventario_movimiento
        
        // Por ejemplo, si tienes detalle_pedido:
        try {
            await db.execute(
                'DELETE FROM detalle_pedido WHERE producto_id = ?',
                [id]
            );
        } catch (error) {
            console.log("⚠️ No se pudo eliminar de detalle_pedido:", error.message);
        }
        
        try {
            // Usar la columna id_producto (coherente con otros controladores)
            await db.execute(
                'DELETE FROM inventario_movimiento WHERE id_producto = ?',
                [id]
            );
        } catch (error) {
            console.log("⚠️ No se pudo eliminar de inventario_movimiento:", error.message);
        }

        // 5. Finalmente, eliminar el producto
        await db.execute(
            'DELETE FROM producto WHERE id_producto = ? AND microempresa_id = ?',
            [id, microempresa_id]
        );

        res.json({ message: "Producto eliminado exitosamente" });
    } catch (error) {
        console.error("❌ Error eliminando producto:", error);
        
        // Mensaje más específico según el error
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ 
                error: "No se puede eliminar el producto",
                message: "El producto está siendo referenciado en otras partes del sistema. Contacta al administrador."
            });
        }
        
        res.status(500).json({ 
            error: "Error al eliminar producto",
            details: error.message 
        });
    }
};
// Obtener notificaciones de stock
exports.getNotificacionesStock = async (req, res) => {
    const { microempresa_id } = req.user;

    try {
        const [notificaciones] = await db.execute(
            `SELECT n.*, p.nombre as producto_nombre, p.stock_actual, p.stock_minimo
            FROM notificacion_stock n
            JOIN producto p ON n.producto_id = p.id_producto
            WHERE n.microempresa_id = ? AND n.leida = 0
            ORDER BY n.fecha_notificacion DESC`,
            [microempresa_id]
        );

        res.json(notificaciones);
    } catch (error) {
        console.error("Error obteniendo notificaciones:", error);
        res.status(500).json({ error: "Error al obtener notificaciones" });
    }
};

// Marcar notificación como leída
exports.marcarNotificacionLeida = async (req, res) => {
    const { id } = req.params;
    const { microempresa_id } = req.user;

    try {
        await db.execute(
            'UPDATE notificacion_stock SET leida = 1 WHERE id_notificacion = ? AND microempresa_id = ?',
            [id, microempresa_id]
        );

        res.json({ message: "Notificación marcada como leída" });
    } catch (error) {
        console.error("Error marcando notificación:", error);
        res.status(500).json({ error: "Error al marcar notificación" });
    }
};

// Subir imagen de producto
exports.uploadImagen = async (req, res) => {
    const { id } = req.params;
    const { microempresa_id } = req.user;

    try {
        if (!req.file) {
            return res.status(400).json({ message: "No se envió ninguna imagen" });
        }

        const imagen_url = req.file.filename;

        // Obtener imagen anterior para eliminarla
        const [productoAnterior] = await db.execute(
            'SELECT imagen_url FROM producto WHERE id_producto = ? AND microempresa_id = ?',
            [id, microempresa_id]
        );

        if (productoAnterior.length === 0) {
            return res.status(404).json({ message: "Producto no encontrado" });
        }

        // Eliminar imagen anterior si existe
        if (productoAnterior[0].imagen_url) {
            const oldImagePath = path.join(__dirname, '..', 'uploads', 'productos', productoAnterior[0].imagen_url);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // Actualizar producto con nueva imagen
        await db.execute(
            'UPDATE producto SET imagen_url = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id_producto = ? AND microempresa_id = ?',
            [imagen_url, id, microempresa_id]
        );

        res.json({ 
            message: "Imagen subida exitosamente",
            imagen_url: imagen_url
        });
    } catch (error) {
        console.error("Error subiendo imagen:", error);
        res.status(500).json({ error: "Error al subir imagen" });
    }
};