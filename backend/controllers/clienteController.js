const db = require('../config/db');


// 1. REGISTRAR CLIENTE
exports.createCliente = async (req, res) => {
    const { nombre_razon_social, ci_nit, telefono, email, microempresa_id_manual } = req.body;
    const { rol, microempresa_id } = req.user;

    let idEmpresaFinal = microempresa_id;
    if (rol === 'super_admin' && microempresa_id_manual) {
        idEmpresaFinal = microempresa_id_manual;
    }

    try {
        const emailFinal = (email && email.trim() !== '') ? email : null;
        const razonSocialFinal = (nombre_razon_social && nombre_razon_social.trim() !== '') ? nombre_razon_social : null;
        const telefonoFinal = (telefono && telefono.trim() !== '') ? telefono : null;

        await db.execute(
            `INSERT INTO CLIENTE 
            (nombre_razon_social, ci_nit, telefono, email, microempresa_id, estado) 
            VALUES (?, ?, ?, ?, ?, 'activo')`,
            [razonSocialFinal, ci_nit, telefonoFinal, emailFinal, idEmpresaFinal]
        );

        res.status(201).json({ message: "Cliente registrado con éxito" });
    } catch (error) {
        console.error("ERROR EN SQL CREATE:", error); 
        res.status(500).json({ error: error.message });
    }
};


//3. EDITAR CLIENTE 
exports.updateCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_razon_social, ci_nit, telefono, email, microempresa_id_manual } = req.body;

        const [existente] = await db.query('SELECT * FROM cliente WHERE id_cliente = ?', [id]);
        if (existente.length === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        if (req.user.rol !== 'super_admin') {
            if (existente[0].microempresa_id !== req.user.microempresa_id) {
                return res.status(403).json({ message: 'No tienes permiso para editar este cliente' });
            }
        }

        const [duplicadoCi] = await db.query(
            'SELECT id_cliente FROM cliente WHERE ci_nit = ? AND id_cliente != ?', 
            [ci_nit, id]
        );
        if (duplicadoCi.length > 0) {
            return res.status(400).json({ message: `El CI/NIT ${ci_nit} ya está registrado en otro cliente.` });
        }
        let query = 'UPDATE cliente SET nombre_razon_social=?, ci_nit=?, telefono=?, email=?';
        let params = [
            nombre_razon_social,
            ci_nit, 
            telefono || null, 
            email || null
        ];

        if (req.user.rol === 'super_admin' && microempresa_id_manual) {
            query += ', microempresa_id=?';
            params.push(microempresa_id_manual);
        }

        query += ' WHERE id_cliente=?';
        params.push(id);

        await db.query(query, params);
        
        res.json({ message: 'Cliente actualizado correctamente' });

    } catch (error) {
        console.error("❌ Error en updateCliente:", error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya existe un cliente con ese CI o Email.' });
        }
        
        res.status(500).json({ message: 'Error interno al actualizar (revisa la terminal)' });
    }
};

// 3. CAMBIAR ESTADO (INTERRUPTOR / SWITCH)
exports.toggleEstado = async (req, res) => {
    const { id } = req.params;
    const { nuevoEstado } = req.body;
    const { rol, microempresa_id } = req.user;

    if (!['activo', 'inactivo'].includes(nuevoEstado)) {
        return res.status(400).json({ message: "Estado inválido. Use 'activo' o 'inactivo'" });
    }

    try {
        let query = '';
        let params = [];

        if (rol === 'super_admin') {
            query = 'UPDATE CLIENTE SET estado = ? WHERE id_cliente = ?';
            params = [nuevoEstado, id];
        } else {
            query = 'UPDATE CLIENTE SET estado = ? WHERE id_cliente = ? AND microempresa_id = ?';
            params = [nuevoEstado, id, microempresa_id];
        }

        const [result] = await db.execute(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "No se pudo cambiar el estado" });
        }

        res.json({ message: `Estado actualizado a ${nuevoEstado}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
// 4. OBTENER LISTA DE CLIENTES
exports.getClientes = async (req, res) => {
    const { rol, microempresa_id } = req.user; 

    try {
        let query = '';
        let params = [];
        if (rol === 'super_admin') {
            query = `
                SELECT c.*, m.nombre as empresa_nombre 
                FROM CLIENTE c 
                JOIN MICROEMPRESA m ON c.microempresa_id = m.id_microempresa 
                ORDER BY c.id_cliente DESC
            `;
        } else {
            query = `
                SELECT * FROM CLIENTE 
                WHERE microempresa_id = ? 
                ORDER BY id_cliente DESC
            `;
            params = [microempresa_id];
        }

        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};


// 5. ELIMINAR =
exports.deleteCliente = async (req, res) => {
    const { id } = req.params;
    const { rol, microempresa_id } = req.user;

    try {
        let query = '';
        let params = [];

        if (rol === 'super_admin') {
            query = 'UPDATE CLIENTE SET estado = "inactivo" WHERE id_cliente = ?';
            params = [id];
        } else {
            query = 'UPDATE CLIENTE SET estado = "inactivo" WHERE id_cliente = ? AND microempresa_id = ?';
            params = [id, microempresa_id];
        }

        const [result] = await db.execute(query, params);

        if (result.affectedRows === 0) return res.status(404).json({ message: "Error al eliminar" });

        res.json({ message: "Cliente desactivado correctamente" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 6. LISTAR EMPRESAS 
exports.getListaEmpresasParaSelector = async (req, res) => {
    try {
        const [empresas] = await db.execute(
            'SELECT id_microempresa, nombre FROM MICROEMPRESA WHERE estado = "activa" ORDER BY nombre ASC'
        );
        res.json(empresas);
    } catch (error) {
        console.error("Error cargando empresas:", error);
        res.status(500).json({ error: "Error al cargar lista de empresas" });
    }
};
