const db = require('../config/db');

// Crear categoría (solo admin)
exports.createCategoria = async (req, res) => {
    const { nombre, descripcion } = req.body;
    const { microempresa_id } = req.user;

    try {
        // Verificar si ya existe la categoría en esta empresa
        const [existe] = await db.execute(
            'SELECT id_categoria FROM categoria_producto WHERE nombre = ? AND microempresa_id = ?',
            [nombre, microempresa_id]
        );

        if (existe.length > 0) {
            return res.status(400).json({ message: "Ya existe una categoría con este nombre" });
        }

        await db.execute(
            'INSERT INTO categoria_producto (nombre, descripcion, microempresa_id) VALUES (?, ?, ?)',
            [nombre, descripcion, microempresa_id]
        );
        
        res.status(201).json({ message: "Categoría creada exitosamente" });
    } catch (error) {
        console.error("Error creando categoría:", error);
        res.status(500).json({ error: "Error al crear categoría" });
    }
};

// Obtener categorías por empresa (admin)
exports.getCategoriasByEmpresa = async (req, res) => {
    const { microempresa_id } = req.user;

    try {
        const [categorias] = await db.execute(
            `SELECT id_categoria, nombre, descripcion, estado, fecha_creacion,
            (SELECT COUNT(*) FROM producto WHERE categoria = nombre AND microempresa_id = ?) as total_productos
            FROM categoria_producto 
            WHERE microempresa_id = ? 
            ORDER BY nombre`,
            [microempresa_id, microempresa_id]
        );
        
        res.json(categorias);
    } catch (error) {
        console.error("Error obteniendo categorías:", error);
        res.status(500).json({ error: "Error al obtener categorías" });
    }
};

// Obtener categorías para el portal (público)
exports.getCategoriasPublic = async (req, res) => {
    const { microempresaId } = req.params;

    try {
        const [categorias] = await db.execute(
            `SELECT c.*,
            (SELECT COUNT(*) FROM producto p 
             WHERE p.categoria = c.nombre 
             AND p.microempresa_id = c.microempresa_id 
             AND p.visible_portal = 1 
             AND p.stock_actual > 0) as total_productos
            FROM categoria_producto c
            WHERE c.microempresa_id = ? 
            AND c.estado = 'activa'
            ORDER BY c.nombre`,
            [microempresaId]
        );
        
        res.json(categorias);
    } catch (error) {
        console.error("Error obteniendo categorías públicas:", error);
        res.status(500).json({ error: "Error al obtener categorías" });
    }
};

// Actualizar categoría
exports.updateCategoria = async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, estado } = req.body;
    const { microempresa_id } = req.user;

    try {
        await db.execute(
            'UPDATE categoria_producto SET nombre = ?, descripcion = ?, estado = ? WHERE id_categoria = ? AND microempresa_id = ?',
            [nombre, descripcion, estado, id, microempresa_id]
        );
        
        res.json({ message: "Categoría actualizada exitosamente" });
    } catch (error) {
        console.error("Error actualizando categoría:", error);
        res.status(500).json({ error: "Error al actualizar categoría" });
    }
};

// Eliminar categoría (solo si no tiene productos)
exports.deleteCategoria = async (req, res) => {
    const { id } = req.params;
    const { microempresa_id } = req.user;

    try {
        // Verificar si la categoría tiene productos
        const [categoria] = await db.execute(
            'SELECT nombre FROM categoria_producto WHERE id_categoria = ? AND microempresa_id = ?',
            [id, microempresa_id]
        );

        if (categoria.length === 0) {
            return res.status(404).json({ message: "Categoría no encontrada" });
        }

        const nombreCategoria = categoria[0].nombre;

        // Contar productos en esta categoría
        const [productos] = await db.execute(
            'SELECT COUNT(*) as total FROM producto WHERE categoria = ? AND microempresa_id = ?',
            [nombreCategoria, microempresa_id]
        );

        if (productos[0].total > 0) {
            return res.status(400).json({ 
                message: "No se puede eliminar la categoría porque tiene productos asociados",
                total_productos: productos[0].total
            });
        }

        await db.execute(
            'DELETE FROM categoria_producto WHERE id_categoria = ? AND microempresa_id = ?',
            [id, microempresa_id]
        );
        
        res.json({ message: "Categoría eliminada exitosamente" });
    } catch (error) {
        console.error("Error eliminando categoría:", error);
        res.status(500).json({ error: "Error al eliminar categoría" });
    }
};