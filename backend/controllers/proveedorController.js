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
        // Verificar si ya existe un proveedor con el mismo CI/NIT
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
            (nombre, nombre_contacto, direccion, telefono, email, ci_nit, descripcion, microempresa_id, estado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'activo')`,
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

// 2. OBTENER PROVEEDORES POR EMPRESA (solo activos por defecto)
exports.getProveedoresByEmpresa = async (req, res) => {
    const { microempresa_id } = req.user;
    const { incluir_inactivos = 'false' } = req.query; // Opcional: incluir inactivos

    try {
        let query = `
            SELECT p.*,
            (SELECT COUNT(*) FROM producto WHERE proveedor_id = p.id_proveedor) as total_productos,
            (SELECT COUNT(*) FROM detalle_compra WHERE id_proveedor = p.id_proveedor) as total_compras
            FROM proveedor p
            WHERE p.microempresa_id = ?
        `;
        
        const params = [microempresa_id];

        if (incluir_inactivos !== 'true') {
            query += ' AND p.estado = "activo"';
        }

        query += ' ORDER BY p.estado ASC, p.nombre ASC';

        const [proveedores] = await db.execute(query, params);
        
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
        
        res.json({
            proveedor: proveedores[0],
            productos,
            estadisticas: {
                total_productos: productos.length
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
        // Verificar que el proveedor existe
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

// 5. CAMBIAR ESTADO DEL PROVEEDOR (activar/desactivar)
exports.toggleEstadoProveedor = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body; // 'activo' o 'inactivo'
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

        // Validar estado
        if (!['activo', 'inactivo'].includes(estado)) {
            return res.status(400).json({ 
                message: "Estado inválido. Use 'activo' o 'inactivo'" 
            });
        }

        // Verificar si tiene productos asociados antes de desactivar
        if (estado === 'inactivo') {
            const [productos] = await db.execute(
                'SELECT COUNT(*) as total FROM producto WHERE proveedor_id = ?',
                [id]
            );
            
            if (productos[0].total > 0) {
                return res.status(400).json({ 
                    message: "No se puede desactivar el proveedor porque tiene productos asociados",
                    total_productos: productos[0].total,
                    sugerencia: "Primero desasocia los productos o cámbiales de proveedor"
                });
            }
        }

        // Actualizar estado
        await db.execute(
            'UPDATE proveedor SET estado = ? WHERE id_proveedor = ? AND microempresa_id = ?',
            [estado, id, microempresa_id]
        );

        res.json({ 
            message: `Proveedor ${estado === 'activo' ? 'activado' : 'desactivado'} con éxito`,
            nuevo_estado: estado
        });
    } catch (error) {
        console.error("❌ Error cambiando estado del proveedor:", error);
        res.status(500).json({ 
            error: "Error al cambiar estado del proveedor",
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
            AND p.estado = 'activo'
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

// 7. OBTENER PROVEEDORES PARA SELECTOR (solo activos)
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

// 8. OBTENER PROVEEDORES INACTIVOS
exports.getProveedoresInactivos = async (req, res) => {
    const { microempresa_id } = req.user;

    try {
        const [proveedores] = await db.execute(
            `SELECT p.*,
            (SELECT COUNT(*) FROM producto WHERE proveedor_id = p.id_proveedor) as total_productos,
            (SELECT COUNT(*) FROM detalle_compra WHERE id_proveedor = p.id_proveedor) as total_compras
            FROM proveedor p
            WHERE p.microempresa_id = ? AND p.estado = 'inactivo'
            ORDER BY p.nombre ASC`,
            [microempresa_id]
        );
        
        res.json(proveedores);
    } catch (error) {
        console.error("❌ Error obteniendo proveedores inactivos:", error);
        res.status(500).json({ 
            error: "Error al obtener proveedores inactivos",
            details: error.message 
        });
    }
};