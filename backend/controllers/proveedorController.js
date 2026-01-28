const db = require('../config/db');

// 1. CREAR PROVEEDOR
exports.createProveedor = async (req, res) => {
    const { 
        nombre, 
        nombre_contacto, 
        direccion, 
        telefono, 
        email, 
        ci_nit, 
        descripcion 
    } = req.body;
    
    const { microempresa_id } = req.user;

    try {
        // Verificar si ya existe un proveedor con el mismo CI/NIT en esta empresa
        if (ci_nit) {
            const [existe] = await db.execute(
                'SELECT id_proveedor FROM proveedor WHERE ci_nit = ? AND microempresa_id = ?',
                [ci_nit, microempresa_id]
            );
            
            if (existe.length > 0) {
                return res.status(400).json({ 
                    message: "Ya existe un proveedor con este CI/NIT en tu empresa" 
                });
            }
        }

        // Insertar proveedor
        await db.execute(
            `INSERT INTO proveedor 
            (nombre, nombre_contacto, direccion, telefono, email, ci_nit, descripcion, microempresa_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre, nombre_contacto, direccion, telefono, email, ci_nit, descripcion, microempresa_id]
        );

        res.status(201).json({ 
            message: "Proveedor registrado con éxito" 
        });
    } catch (error) {
        console.error("❌ Error creando proveedor:", error);
        res.status(500).json({ 
            error: "Error al crear proveedor",
            details: error.message 
        });
    }
};

// 2. OBTENER PROVEEDORES POR EMPRESA
exports.getProveedoresByEmpresa = async (req, res) => {
    const { microempresa_id } = req.user;

    try {
        const [proveedores] = await db.execute(
            `SELECT p.*,
            (SELECT COUNT(*) FROM producto WHERE proveedor_id = p.id_proveedor) as total_productos,
            (SELECT COUNT(*) FROM detalle_compra WHERE id_proveedor = p.id_proveedor) as total_compras
            FROM proveedor p
            WHERE p.microempresa_id = ?
            ORDER BY p.nombre ASC`,
            [microempresa_id]
        );
        
        res.json(proveedores);
    } catch (error) {
        console.error("❌ Error obteniendo proveedores:", error);
        res.status(500).json({ 
            error: "Error al obtener proveedores",
            details: error.message 
        });
    }
};

// 3. OBTENER PROVEEDOR POR ID
exports.getProveedorById = async (req, res) => {
    const { id } = req.params;
    const { microempresa_id } = req.user;

    try {
        const [proveedores] = await db.execute(
            `SELECT p.*,
            (SELECT COUNT(*) FROM producto WHERE proveedor_id = p.id_proveedor) as total_productos,
            (SELECT COUNT(*) FROM detalle_compra WHERE id_proveedor = p.id_proveedor) as total_compras
            FROM proveedor p
            WHERE p.id_proveedor = ? AND p.microempresa_id = ?`,
            [id, microempresa_id]
        );
        
        if (proveedores.length === 0) {
            return res.status(404).json({ 
                message: "Proveedor no encontrado" 
            });
        }
        
        // Obtener productos de este proveedor
        const [productos] = await db.execute(
            `SELECT id_producto, nombre, precio, stock_actual, estado
            FROM producto
            WHERE proveedor_id = ? AND microempresa_id = ?
            ORDER BY nombre ASC`,
            [id, microempresa_id]
        );
        
        // Obtener compras de este proveedor
        const [compras] = await db.execute(
            `SELECT dc.*, c.fecha, c.total
            FROM detalle_compra dc
            JOIN compra c ON dc.id_compra = c.id_compra
            WHERE dc.id_proveedor = ? AND c.id_microempresa = ?
            ORDER BY c.fecha DESC
            LIMIT 10`,
            [id, microempresa_id]
        );
        
        res.json({
            proveedor: proveedores[0],
            productos,
            compras,
            estadisticas: {
                total_productos: productos.length,
                total_compras: compras.length,
                valor_total_compras: compras.reduce((sum, compra) => sum + parseFloat(compra.subtotal), 0)
            }
        });
    } catch (error) {
        console.error("❌ Error obteniendo proveedor:", error);
        res.status(500).json({ 
            error: "Error al obtener proveedor",
            details: error.message 
        });
    }
};

// 4. ACTUALIZAR PROVEEDOR
exports.updateProveedor = async (req, res) => {
    const { id } = req.params;
    const { 
        nombre, 
        nombre_contacto, 
        direccion, 
        telefono, 
        email, 
        ci_nit, 
        descripcion,
        estado 
    } = req.body;
    
    const { microempresa_id } = req.user;

    try {
        // Verificar que el proveedor existe y pertenece a la empresa
        const [existe] = await db.execute(
            'SELECT id_proveedor FROM proveedor WHERE id_proveedor = ? AND microempresa_id = ?',
            [id, microempresa_id]
        );
        
        if (existe.length === 0) {
            return res.status(404).json({ 
                message: "Proveedor no encontrado" 
            });
        }

        // Verificar si el CI/NIT ya está en uso por otro proveedor
        if (ci_nit) {
            const [duplicado] = await db.execute(
                'SELECT id_proveedor FROM proveedor WHERE ci_nit = ? AND id_proveedor != ? AND microempresa_id = ?',
                [ci_nit, id, microempresa_id]
            );
            
            if (duplicado.length > 0) {
                return res.status(400).json({ 
                    message: "El CI/NIT ya está registrado para otro proveedor" 
                });
            }
        }

        // Actualizar proveedor
        await db.execute(
            `UPDATE proveedor 
            SET nombre = ?, nombre_contacto = ?, direccion = ?, telefono = ?, 
                email = ?, ci_nit = ?, descripcion = ?, estado = ?
            WHERE id_proveedor = ? AND microempresa_id = ?`,
            [nombre, nombre_contacto, direccion, telefono, email, ci_nit, descripcion, estado, id, microempresa_id]
        );

        res.json({ 
            message: "Proveedor actualizado con éxito" 
        });
    } catch (error) {
        console.error("❌ Error actualizando proveedor:", error);
        res.status(500).json({ 
            error: "Error al actualizar proveedor",
            details: error.message 
        });
    }
};

// 5. ELIMINAR PROVEEDOR (solo si no tiene productos asociados)
exports.deleteProveedor = async (req, res) => {
    const { id } = req.params;
    const { microempresa_id } = req.user;

    try {
        // Verificar que el proveedor existe
        const [proveedor] = await db.execute(
            'SELECT * FROM proveedor WHERE id_proveedor = ? AND microempresa_id = ?',
            [id, microempresa_id]
        );
        
        if (proveedor.length === 0) {
            return res.status(404).json({ 
                message: "Proveedor no encontrado" 
            });
        }

        // Verificar si tiene productos asociados
        const [productos] = await db.execute(
            'SELECT COUNT(*) as total FROM producto WHERE proveedor_id = ?',
            [id]
        );
        
        if (productos[0].total > 0) {
            return res.status(400).json({ 
                message: "No se puede eliminar el proveedor porque tiene productos asociados",
                total_productos: productos[0].total
            });
        }

        // Verificar si tiene compras asociadas
        const [compras] = await db.execute(
            'SELECT COUNT(*) as total FROM detalle_compra WHERE id_proveedor = ?',
            [id]
        );
        
        if (compras[0].total > 0) {
            return res.status(400).json({ 
                message: "No se puede eliminar el proveedor porque tiene compras asociadas",
                total_compras: compras[0].total
            });
        }

        // Eliminar proveedor
        await db.execute(
            'DELETE FROM proveedor WHERE id_proveedor = ? AND microempresa_id = ?',
            [id, microempresa_id]
        );

        res.json({ 
            message: "Proveedor eliminado con éxito" 
        });
    } catch (error) {
        console.error("❌ Error eliminando proveedor:", error);
        res.status(500).json({ 
            error: "Error al eliminar proveedor",
            details: error.message 
        });
    }
};

// 6. BUSCAR PROVEEDORES
exports.searchProveedores = async (req, res) => {
    const { microempresa_id } = req.user;
    const { query } = req.query;

    try {
        const [proveedores] = await db.execute(
            `SELECT p.*,
            (SELECT COUNT(*) FROM producto WHERE proveedor_id = p.id_proveedor) as total_productos
            FROM proveedor p
            WHERE p.microempresa_id = ? 
            AND (p.nombre LIKE ? OR p.nombre_contacto LIKE ? OR p.ci_nit LIKE ? OR p.email LIKE ?)
            ORDER BY p.nombre ASC`,
            [microempresa_id, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
        );
        
        res.json(proveedores);
    } catch (error) {
        console.error("❌ Error buscando proveedores:", error);
        res.status(500).json({ 
            error: "Error al buscar proveedores",
            details: error.message 
        });
    }
};

// 7. OBTENER PROVEEDORES PARA SELECTOR (para formularios)
exports.getProveedoresForSelect = async (req, res) => {
    const { microempresa_id } = req.user;

    try {
        const [proveedores] = await db.execute(
            `SELECT id_proveedor, nombre, ci_nit
            FROM proveedor
            WHERE microempresa_id = ? AND estado = 'activo'
            ORDER BY nombre ASC`,
            [microempresa_id]
        );
        
        res.json(proveedores);
    } catch (error) {
        console.error("❌ Error obteniendo proveedores para selector:", error);
        res.status(500).json({ 
            error: "Error al obtener proveedores",
            details: error.message 
        });
    }
};