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

// 2. OBTENER PROVEEDORES POR EMPRESA
exports.getProveedoresByEmpresa = async (req, res) => {
    const { microempresa_id } = req.user;
    try {
        const [rows] = await db.execute(
            `SELECT p.*, 
            (SELECT COUNT(*) FROM detalle_compra WHERE id_proveedor = p.id_proveedor) as total_compras
            FROM proveedor p 
            WHERE p.microempresa_id = ? 
            ORDER BY p.nombre ASC`,
            [microempresa_id]
        );
        res.json(rows);
    } catch (error) {
        console.error("❌ Error en proveedores:", error);
        res.status(500).json({ error: error.message });
    }
};

// 3. OBTENER PROVEEDOR POR ID
exports.getProveedorById = async (req, res) => {
    const { id } = req.params;
    const { microempresa_id } = req.user;

    try {
        const [proveedores] = await db.execute(
            `SELECT p.*,
            (SELECT COUNT(DISTINCT id_producto) FROM detalle_compra WHERE id_proveedor = p.id_proveedor) as total_productos,
            (SELECT COUNT(*) FROM detalle_compra WHERE id_proveedor = p.id_proveedor) as total_compras
            FROM proveedor p
            WHERE p.id_proveedor = ? AND p.microempresa_id = ?`,
            [id, microempresa_id]
        );
        
        if (proveedores.length === 0) return res.status(404).json({ message: "Proveedor no encontrado" });
        
        // OJO: Esta consulta fallará porque 'producto' no tiene 'id_proveedor'. 
        // La ajustamos para buscar en detalle_compra:
        const [productos] = await db.execute(
            `SELECT DISTINCT pr.id_producto, pr.nombre, pr.precio, pr.stock_actual, pr.estado
            FROM producto pr
            INNER JOIN detalle_compra dc ON pr.id_producto = dc.id_producto
            WHERE dc.id_proveedor = ? AND pr.microempresa_id = ?
            ORDER BY pr.nombre ASC`,
            [id, microempresa_id]
        );
        
        res.json({ proveedor: proveedores[0], productos, estadisticas: { total_productos: productos.length } });
    } catch (error) {
        console.error("❌ Error obteniendo proveedor:", error);
        res.status(500).json({ error: "Error al obtener proveedor", details: error.message });
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

// 5. CAMBIAR ESTADO (Ajustado para validar contra detalle_compra)
exports.toggleEstadoProveedor = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    const { microempresa_id } = req.user;

    try {
        if (estado === 'inactivo') {
            // Buscamos si tiene movimientos de compra registrados
            const [compras] = await db.execute(
                'SELECT COUNT(*) as total FROM detalle_compra WHERE id_proveedor = ?',
                [id]
            );
            
            if (compras[0].total > 0) {
                return res.status(400).json({ 
                    message: "No se puede desactivar un proveedor con historial de compras",
                    total_operaciones: compras[0].total
                });
            }
        }

        await db.execute(
            'UPDATE proveedor SET estado = ? WHERE id_proveedor = ? AND microempresa_id = ?',
            [estado, id, microempresa_id]
        );

        res.json({ message: `Proveedor ${estado} con éxito`, nuevo_estado: estado });
    } catch (error) {
        res.status(500).json({ error: "Error al cambiar estado", details: error.message });
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
        // CORRECCIÓN: 
        // 1. Quitamos 'ci_nit' del SELECT porque no existe en la tabla.
        // 2. Quitamos "AND estado = 'activo'" del WHERE si tu tabla no tiene columna estado.
        const [proveedores] = await db.execute(
            `SELECT id_proveedor, nombre 
             FROM proveedor 
             WHERE microempresa_id = ? 
             ORDER BY nombre ASC`,
            [microempresa_id]
        );
        
        res.json(proveedores);
    } catch (error) {
        console.error("❌ Error obteniendo proveedores para selector:", error);
        res.status(500).json({ error: "Error al obtener la lista de proveedores" });
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