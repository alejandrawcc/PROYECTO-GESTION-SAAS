const db = require('../config/db');

// Obtener datos completos del portal de una microempresa
exports.getPortalData = async (req, res) => {
    const { microempresaId } = req.params;

    try {
        // Obtener información de la microempresa
        const [empresa] = await db.execute(
            `SELECT id_microempresa, nombre, direccion, telefono, email, descripcion, rubro,
            (SELECT COUNT(*) FROM producto WHERE microempresa_id = ? AND visible_portal = 1 AND stock_actual > 0) as total_productos
            FROM microempresa 
            WHERE id_microempresa = ? AND estado = 'activa'`,
            [microempresaId, microempresaId]
        );

        if (empresa.length === 0) {
            return res.status(404).json({ message: "Microempresa no encontrada o inactiva" });
        }

        // Obtener categorías con productos visibles
        const [categorias] = await db.execute(
            `SELECT DISTINCT p.categoria as nombre,
            (SELECT COUNT(*) FROM producto 
             WHERE microempresa_id = ? 
             AND categoria = p.categoria 
             AND visible_portal = 1 
             AND stock_actual > 0) as total_productos
            FROM producto p
            WHERE p.microempresa_id = ? 
            AND p.visible_portal = 1
            AND p.stock_actual > 0
            AND p.categoria IS NOT NULL
            AND p.categoria != ''
            ORDER BY p.categoria`,
            [microempresaId, microempresaId]
        );

        // Obtener productos visibles
        const [productos] = await db.execute(
            `SELECT p.*
            FROM producto p
            WHERE p.microempresa_id = ? 
            AND p.visible_portal = 1
            AND p.stock_actual > 0
            AND p.estado = 'stock'
            ORDER BY p.fecha_actualizacion DESC`,
            [microempresaId]
        );

        res.json({
            empresa: empresa[0],
            categorias,
            productos,
            estadisticas: {
                total_productos: productos.length,
                total_categorias: categorias.length
            }
        });
    } catch (error) {
        console.error("Error obteniendo datos del portal:", error);
        res.status(500).json({ error: "Error al obtener datos del portal" });
    }
};

// Obtener productos por categoría
exports.getProductosByCategoria = async (req, res) => {
    const { microempresaId, categoria } = req.params;

    try {
        const [productos] = await db.execute(
            `SELECT p.*
            FROM producto p
            WHERE p.microempresa_id = ? 
            AND p.categoria = ?
            AND p.visible_portal = 1
            AND p.stock_actual > 0
            AND p.estado = 'stock'
            ORDER BY p.fecha_actualizacion DESC`,
            [microempresaId, categoria]
        );

        res.json(productos);
    } catch (error) {
        console.error("Error obteniendo productos por categoría:", error);
        res.status(500).json({ error: "Error al obtener productos" });
    }
};

// Buscar productos en el portal
exports.searchProductos = async (req, res) => {
    const { microempresaId } = req.params;
    const { query } = req.query;

    try {
        const [productos] = await db.execute(
            `SELECT p.*
            FROM producto p
            WHERE p.microempresa_id = ? 
            AND p.visible_portal = 1
            AND p.stock_actual > 0
            AND p.estado = 'stock'
            AND (p.nombre LIKE ? OR p.descripcion LIKE ?)
            ORDER BY p.fecha_actualizacion DESC`,
            [microempresaId, `%${query}%`, `%${query}%`]
        );

        res.json(productos);
    } catch (error) {
        console.error("Error buscando productos:", error);
        res.status(500).json({ error: "Error al buscar productos" });
    }
};