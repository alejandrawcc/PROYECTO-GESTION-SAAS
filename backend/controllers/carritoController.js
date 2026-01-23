const db = require('../config/db');

// Carrito temporal en memoria (en producción usar Redis o base de datos)
let carritosTemporales = {};

// Agregar producto al carrito
exports.agregarAlCarrito = async (req, res) => {
    const { microempresaId, productoId, cantidad, clienteData } = req.body;
    
    try {
        // Verificar producto y stock
        const [producto] = await db.execute(
            `SELECT * FROM producto 
            WHERE id_producto = ? 
            AND microempresa_id = ?
            AND visible_portal = 1
            AND estado = 'stock'
            AND stock_actual > 0`,
            [productoId, microempresaId]
        );

        if (producto.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: "Producto no disponible" 
            });
        }

        const productoInfo = producto[0];
        
        if (productoInfo.stock_actual < cantidad) {
            return res.status(400).json({ 
                success: false,
                message: `Stock insuficiente. Disponible: ${productoInfo.stock_actual}` 
            });
        }

        // Generar ID de carrito
        let carritoId = req.headers['x-carrito-id'] || req.body.carritoId;
        if (!carritoId) {
            carritoId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        // Inicializar carrito si no existe
        if (!carritosTemporales[carritoId]) {
            carritosTemporales[carritoId] = {
                microempresa_id: parseInt(microempresaId),
                productos: [],
                total: 0,
                cliente: clienteData || null,
                created_at: new Date()
            };
        }

        // Verificar si el producto ya está en el carrito
        const productoExistente = carritosTemporales[carritoId].productos.find(
            p => p.id_producto === parseInt(productoId)
        );

        const precio = parseFloat(productoInfo.precio || 0);
        
        if (productoExistente) {
            // Actualizar cantidad
            productoExistente.cantidad += parseInt(cantidad);
            productoExistente.subtotal = productoExistente.cantidad * precio;
        } else {
            // Agregar nuevo producto
            carritosTemporales[carritoId].productos.push({
                id_producto: parseInt(productoId),
                nombre: productoInfo.nombre,
                precio: precio,
                cantidad: parseInt(cantidad),
                subtotal: parseInt(cantidad) * precio,
                stock_disponible: productoInfo.stock_actual,
                imagen_url: productoInfo.imagen_url
            });
        }

        // Recalcular total (asegurando que sea número)
        const nuevoTotal = carritosTemporales[carritoId].productos
            .reduce((sum, p) => sum + (parseFloat(p.subtotal) || 0), 0);
        
        carritosTemporales[carritoId].total = parseFloat(nuevoTotal.toFixed(2));

        res.json({
            success: true,
            carritoId: carritoId,
            carrito: {
                ...carritosTemporales[carritoId],
                total: carritosTemporales[carritoId].total
            },
            message: "Producto agregado al carrito"
        });

    } catch (error) {
        console.error("Error agregando al carrito:", error);
        res.status(500).json({ 
            success: false,
            error: "Error al agregar al carrito",
            message: error.message 
        });
    }
};

// Ver carrito actual
exports.verCarrito = (req, res) => {
    const { carritoId } = req.params;
    
    if (!carritosTemporales[carritoId]) {
        return res.status(404).json({ message: "Carrito no encontrado" });
    }

    res.json({
        carrito: carritosTemporales[carritoId]
    });
};

// Eliminar producto del carrito
exports.eliminarDelCarrito = (req, res) => {
    const { carritoId, productoId } = req.params;
    
    if (!carritosTemporales[carritoId]) {
        return res.status(404).json({ message: "Carrito no encontrado" });
    }

    const carrito = carritosTemporales[carritoId];
    const productoIndex = carrito.productos.findIndex(p => p.id_producto === parseInt(productoId));
    
    if (productoIndex === -1) {
        return res.status(404).json({ message: "Producto no encontrado en el carrito" });
    }

    // Eliminar producto
    carrito.productos.splice(productoIndex, 1);
    
    // Recalcular total
    carrito.total = carrito.productos.reduce((sum, p) => sum + p.subtotal, 0);
    
    res.json({
        success: true,
        carrito: carrito,
        message: "Producto eliminado del carrito"
    });
};

// Procesar venta
exports.procesarVenta = async (req, res) => {
    const { carritoId, clienteData, metodoPago } = req.body;
    
    // Iniciar transacción
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();

        // 1. Verificar carrito
        const carrito = carritosTemporales[carritoId];
        if (!carrito || !carrito.productos || carrito.productos.length === 0) {
            await connection.rollback();
            return res.status(400).json({ 
                success: false,
                message: "Carrito vacío o no encontrado" 
            });
        }

        let clienteId = null;
        
        // 2. Gestionar cliente (registrado o nuevo)
        if (clienteData) {
            if (clienteData.id_cliente) {
                // Verificar que el cliente existe y está activo
                const [clienteExistente] = await connection.execute(
                    'SELECT id_cliente, nombre_razon_social, email FROM cliente WHERE id_cliente = ? AND activo = 1 AND estado = "activo"',
                    [clienteData.id_cliente]
                );
                
                if (clienteExistente.length > 0) {
                    clienteId = clienteData.id_cliente;
                    
                    // Actualizar último login
                    await connection.execute(
                        'UPDATE cliente SET ultimo_login = NOW() WHERE id_cliente = ?',
                        [clienteId]
                    );
                    
                    console.log(`✅ Usando cliente existente ID: ${clienteId}, Nombre: ${clienteExistente[0].nombre_razon_social}`);
                } else {
                    console.log(`⚠️ Cliente ID ${clienteData.id_cliente} no encontrado o inactivo, creando nuevo`);
                }
            }
            
            // Si no se encontró cliente existente, crear uno nuevo
            if (!clienteId && clienteData.nombre_razon_social) {
                // Verificar si el email ya existe (si se proporcionó)
                let email = clienteData.email || null;
                if (email) {
                    const [clientePorEmail] = await connection.execute(
                        'SELECT id_cliente FROM cliente WHERE email = ? AND activo = 1',
                        [email]
                    );
                    
                    if (clientePorEmail.length > 0) {
                        clienteId = clientePorEmail[0].id_cliente;
                        console.log(`✅ Usando cliente existente por email: ${email}, ID: ${clienteId}`);
                    }
                }
                
                // Si no existe, crear nuevo cliente
                if (!clienteId) {
                    const [resultCliente] = await connection.execute(
                        `INSERT INTO cliente 
                        (nombre_razon_social, ci_nit, telefono, email, microempresa_id, origen, estado, activo, fecha_registro) 
                        VALUES (?, ?, ?, ?, ?, 'sistema', 'activo', 1, NOW())`,
                        [
                            clienteData.nombre_razon_social.trim(),
                            clienteData.ci_nit ? clienteData.ci_nit.trim() : null,
                            clienteData.telefono ? clienteData.telefono.trim() : null,
                            email,
                            carrito.microempresa_id
                        ]
                    );
                    clienteId = resultCliente.insertId;
                    console.log(`✅ Cliente nuevo creado ID: ${clienteId}, Nombre: ${clienteData.nombre_razon_social}`);
                }
            }
        }
        
        // 3. Si no hay datos de cliente, crear uno genérico
        if (!clienteId) {
            const [resultCliente] = await connection.execute(
                `INSERT INTO cliente 
                (nombre_razon_social, microempresa_id, origen, estado, activo, fecha_registro) 
                VALUES (?, ?, 'sistema', 'activo', 1, NOW())`,
                ['Cliente no registrado', carrito.microempresa_id]
            );
            clienteId = resultCliente.insertId;
            console.log(`✅ Cliente genérico creado ID: ${clienteId}`);
        }

        // 4. Verificar stock antes de proceder
        console.log(`📦 Verificando stock para ${carrito.productos.length} productos...`);
        
        for (const item of carrito.productos) {
            const [productoStock] = await connection.execute(
                'SELECT id_producto, nombre, stock_actual, precio FROM producto WHERE id_producto = ? AND estado = "stock"',
                [item.id_producto]
            );
            
            if (productoStock.length === 0) {
                await connection.rollback();
                return res.status(400).json({ 
                    success: false,
                    message: `Producto "${item.nombre}" no encontrado o discontinuado` 
                });
            }
            
            const producto = productoStock[0];
            
            if (producto.stock_actual < item.cantidad) {
                await connection.rollback();
                return res.status(400).json({ 
                    success: false,
                    message: `Stock insuficiente para "${item.nombre}". Disponible: ${producto.stock_actual}, Solicitado: ${item.cantidad}` 
                });
            }
            
            console.log(`✅ Stock OK: ${item.nombre} - Disponible: ${producto.stock_actual}, Pedido: ${item.cantidad}`);
        }

        // 5. Crear pedido
        const totalDecimal = parseFloat(carrito.total || 0).toFixed(2);
        const metodoPagoFinal = metodoPago || 'efectivo';
        
        console.log(`💰 Creando pedido: Total: ${totalDecimal}, Cliente: ${clienteId}, Método: ${metodoPagoFinal}`);
        
        const [resultPedido] = await connection.execute(
            `INSERT INTO pedido 
            (fecha, total, metodo_pago, estado, cliente_id, usuario_id) 
            VALUES (NOW(), ?, ?, 'completado', ?, NULL)`,
            [totalDecimal, metodoPagoFinal, clienteId]
        );

        const pedidoId = resultPedido.insertId;
        console.log(`✅ Pedido creado ID: ${pedidoId}`);

        // 6. Crear detalles del pedido y actualizar stock
        console.log(`📝 Creando detalles del pedido...`);
        
        for (const item of carrito.productos) {
            const precioDecimal = parseFloat(item.precio || 0).toFixed(2);
            const subtotalDecimal = parseFloat(item.subtotal || 0).toFixed(2);
            
            // Insertar detalle del pedido
            await connection.execute(
                `INSERT INTO detalle_pedido 
                (pedido_id, producto_id, cantidad, precio_unitario, subtotal) 
                VALUES (?, ?, ?, ?, ?)`,
                [pedidoId, item.id_producto, item.cantidad, precioDecimal, subtotalDecimal]
            );
            
            console.log(`✅ Detalle: ${item.nombre} x${item.cantidad} = ${subtotalDecimal}`);

            // Actualizar stock del producto
            const [updateResult] = await connection.execute(
                'UPDATE producto SET stock_actual = stock_actual - ?, fecha_actualizacion = NOW() WHERE id_producto = ?',
                [item.cantidad, item.id_producto]
            );
            
            if (updateResult.affectedRows === 0) {
                throw new Error(`No se pudo actualizar stock del producto ${item.id_producto}`);
            }

            // Verificar stock después de la actualización
            const [productoActualizado] = await connection.execute(
                'SELECT stock_actual FROM producto WHERE id_producto = ?',
                [item.id_producto]
            );

            const nuevoStock = productoActualizado[0].stock_actual;
            console.log(`📊 Stock actualizado: ${item.nombre} -> Nuevo stock: ${nuevoStock}`);

            // Actualizar visibilidad en portal si stock llega a 0
            if (nuevoStock === 0) {
                await connection.execute(
                    'UPDATE producto SET visible_portal = 0 WHERE id_producto = ?',
                    [item.id_producto]
                );

                // Crear notificación de stock agotado
                await connection.execute(
                    `INSERT INTO notificacion_stock 
                    (producto_id, microempresa_id, tipo, mensaje, leida, fecha_notificacion) 
                    VALUES (?, ?, 'agotado', ?, 0, NOW())`,
                    [item.id_producto, carrito.microempresa_id, `⚠️ Producto "${item.nombre}" se ha agotado`]
                );
                
                console.log(`⚠️ Notificación creada: ${item.nombre} agotado`);
            } else if (nuevoStock <= 5) {
                // Crear notificación de stock bajo
                await connection.execute(
                    `INSERT INTO notificacion_stock 
                    (producto_id, microempresa_id, tipo, mensaje, leida, fecha_notificacion) 
                    VALUES (?, ?, 'stock_bajo', ?, 0, NOW())`,
                    [item.id_producto, carrito.microempresa_id, `📉 Producto "${item.nombre}" tiene stock bajo: ${nuevoStock} unidades`]
                );
            }
        }

        // 7. Registrar visita del cliente
        if (clienteId) {
            await connection.execute(
                'INSERT INTO visita_cliente (cliente_id, microempresa_id, fecha_visita, tipo) VALUES (?, ?, NOW(), "compra")',
                [clienteId, carrito.microempresa_id]
            );
            console.log(`👤 Visita registrada para cliente ${clienteId}`);
        }

        // 8. Registrar movimiento de inventario
        for (const item of carrito.productos) {
            await connection.execute(
                `INSERT INTO inventario_movimiento 
                (tipo, cantidad, fecha, producto_id, usuario_id, microempresa_id) 
                VALUES ('salida', ?, NOW(), ?, NULL, ?)`,
                [item.cantidad, item.id_producto, carrito.microempresa_id]
            );
        }

        // 9. Confirmar transacción
        await connection.commit();
        
        // 10. Limpiar carrito después de éxito
        delete carritosTemporales[carritoId];

        console.log(`🎉 Venta procesada exitosamente! Pedido #${pedidoId}, Total: ${totalDecimal}`);

        res.json({
            success: true,
            pedido_id: pedidoId,
            total: totalDecimal,
            cliente_id: clienteId,
            metodo_pago: metodoPagoFinal,
            fecha: new Date().toISOString(),
            message: "✅ Venta procesada exitosamente",
            productos_vendidos: carrito.productos.map(p => ({
                id: p.id_producto,
                nombre: p.nombre,
                cantidad: p.cantidad,
                precio_unitario: parseFloat(p.precio || 0).toFixed(2),
                subtotal: parseFloat(p.subtotal || 0).toFixed(2)
            })),
            resumen: {
                total_productos: carrito.productos.length,
                total_unidades: carrito.productos.reduce((sum, p) => sum + p.cantidad, 0),
                empresa_id: carrito.microempresa_id
            }
        });

    } catch (error) {
        // Revertir transacción en caso de error
        if (connection) {
            await connection.rollback();
        }
        
        console.error("❌ ERROR procesando venta:", error);
        console.error("Stack trace:", error.stack);
        
        res.status(500).json({ 
            success: false,
            error: "Error al procesar la venta",
            message: error.message,
            sqlError: error.sqlMessage || null,
            code: error.code
        });
    } finally {
        // Liberar conexión
        if (connection) {
            connection.release();
        }
    }
};

// Vaciar carrito
exports.vaciarCarrito = (req, res) => {
    const { carritoId } = req.params;
    
    if (carritosTemporales[carritoId]) {
        delete carritosTemporales[carritoId];
    }
    
    res.json({ success: true, message: "Carrito vaciado" });
};