const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTRO DE CLIENTE PÚBLICO
exports.registrarClientePublico = async (req, res) => {
    const { nombre, email, telefono, password } = req.body;

    try {
        // Validar que el email no exista
        const [existeEmail] = await db.execute(
            'SELECT id_cliente FROM cliente WHERE email = ?',
            [email]
        );

        if (existeEmail.length > 0) {
            return res.status(400).json({ 
                message: "El email ya está registrado" 
            });
        }

        // Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear cliente público
        const [result] = await db.execute(
            `INSERT INTO cliente 
            (nombre_razon_social, email, telefono, password, origen, estado, fecha_registro) 
            VALUES (?, ?, ?, ?, 'publico', 'activo', NOW())`,
            [nombre, email, telefono, hashedPassword]
        );

        const clienteId = result.insertId;

        // Generar token JWT para cliente
        const token = jwt.sign(
            { 
                id: clienteId, 
                tipo: 'cliente_publico',
                nombre: nombre,
                email: email
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' } // Token válido por 30 días
        );

        // Actualizar último login
        await db.execute(
            'UPDATE cliente SET ultimo_login = NOW() WHERE id_cliente = ?',
            [clienteId]
        );

        res.status(201).json({
            message: "Cliente registrado exitosamente",
            token: token,
            cliente: {
                id: clienteId,
                nombre: nombre,
                email: email,
                telefono: telefono
            }
        });

    } catch (error) {
        console.error("❌ Error registrando cliente público:", error);
        res.status(500).json({ 
            message: "Error al registrar cliente",
            error: error.message 
        });
    }
};

// LOGIN DE CLIENTE PÚBLICO
exports.loginClientePublico = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Buscar cliente
        const [clientes] = await db.execute(
            'SELECT * FROM cliente WHERE email = ? AND origen = "publico" AND activo = 1',
            [email]
        );

        if (clientes.length === 0) {
            return res.status(404).json({ 
                message: "Cliente no encontrado o cuenta inactiva" 
            });
        }

        const cliente = clientes[0];

        // Verificar contraseña
        const validPass = await bcrypt.compare(password, cliente.password);
        if (!validPass) {
            return res.status(401).json({ 
                message: "Contraseña incorrecta" 
            });
        }

        // Verificar estado
        if (cliente.estado === 'inactivo') {
            return res.status(403).json({ 
                message: "Cuenta inactiva" 
            });
        }

        // Generar token
        const token = jwt.sign(
            { 
                id: cliente.id_cliente, 
                tipo: 'cliente_publico',
                nombre: cliente.nombre_razon_social,
                email: cliente.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Actualizar último login
        await db.execute(
            'UPDATE cliente SET ultimo_login = NOW() WHERE id_cliente = ?',
            [cliente.id_cliente]
        );

        res.json({
            message: "Login exitoso",
            token: token,
            cliente: {
                id: cliente.id_cliente,
                nombre: cliente.nombre_razon_social,
                email: cliente.email,
                telefono: cliente.telefono
            }
        });

    } catch (error) {
        console.error("❌ Error en login cliente:", error);
        res.status(500).json({ 
            message: "Error en el servidor",
            error: error.message 
        });
    }
};

// VERIFICAR TOKEN DE CLIENTE
exports.verifyClienteToken = async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            valid: false, 
            message: "No se proporcionó token" 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verificar que sea token de cliente
        if (decoded.tipo !== 'cliente_publico') {
            return res.status(401).json({ 
                valid: false, 
                message: "Token inválido para cliente" 
            });
        }

        // Buscar cliente actualizado
        const [clientes] = await db.execute(
            'SELECT id_cliente, nombre_razon_social, email, telefono, estado FROM cliente WHERE id_cliente = ? AND activo = 1',
            [decoded.id]
        );

        if (clientes.length === 0) {
            return res.status(404).json({ 
                valid: false, 
                message: "Cliente no encontrado" 
            });
        }

        const cliente = clientes[0];

        res.json({
            valid: true,
            cliente: {
                id: cliente.id_cliente,
                nombre: cliente.nombre_razon_social,
                email: cliente.email,
                telefono: cliente.telefono,
                estado: cliente.estado
            }
        });

    } catch (error) {
        res.status(401).json({ 
            valid: false, 
            message: "Token inválido o expirado" 
        });
    }
};

// OBTENER MICROEMPRESAS ACTIVAS (para mostrar en Home)
exports.getMicroempresasActivas = async (req, res) => {
    try {
        const [microempresas] = await db.execute(
            `SELECT 
                m.id_microempresa,
                m.nombre,
                m.descripcion,
                m.rubro,
                m.direccion,
                m.telefono,
                m.email,
                m.estado,
                (SELECT COUNT(*) FROM producto p WHERE p.microempresa_id = m.id_microempresa AND p.visible_portal = 1 AND p.stock_actual > 0) as productos_count
            FROM microempresa m
            WHERE m.estado = 'activa'
            ORDER BY m.nombre ASC`
        );

        res.json(microempresas);
    } catch (error) {
        console.error("❌ Error obteniendo microempresas:", error);
        res.status(500).json({ 
            message: "Error al obtener microempresas",
            error: error.message 
        });
    }
};

// REGISTRAR VISITA DE CLIENTE A MICROEMPRESA
exports.registrarVisita = async (req, res) => {
    const { cliente_id, microempresa_id } = req.body;

    try {
        // Verificar que el cliente existe
        const [cliente] = await db.execute(
            'SELECT id_cliente FROM cliente WHERE id_cliente = ? AND activo = 1',
            [cliente_id]
        );

        if (cliente.length === 0) {
            return res.status(404).json({ 
                message: "Cliente no encontrado" 
            });
        }

        // Verificar que la microempresa existe y está activa
        const [microempresa] = await db.execute(
            'SELECT id_microempresa FROM microempresa WHERE id_microempresa = ? AND estado = "activa"',
            [microempresa_id]
        );

        if (microempresa.length === 0) {
            return res.status(404).json({ 
                message: "Microempresa no encontrada o inactiva" 
            });
        }

        // Registrar visita
        await db.execute(
            'INSERT INTO visita_cliente (cliente_id, microempresa_id, fecha_visita) VALUES (?, ?, NOW())',
            [cliente_id, microempresa_id]
        );

        res.json({ 
            message: "Visita registrada",
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error("❌ Error registrando visita:", error);
        res.status(500).json({ 
            message: "Error al registrar visita",
            error: error.message 
        });
    }
};

// OBTENER HISTORIAL DE VISITAS DEL CLIENTE
exports.getHistorialVisitas = async (req, res) => {
    const { clienteId } = req.params;

    try {
        const [visitas] = await db.execute(
            `SELECT 
                v.id_visita,
                v.fecha_visita,
                v.tipo,
                m.id_microempresa,
                m.nombre as empresa_nombre,
                m.rubro as empresa_rubro,
                (SELECT COUNT(*) FROM producto p WHERE p.microempresa_id = m.id_microempresa AND p.visible_portal = 1 AND p.stock_actual > 0) as productos_disponibles
            FROM visita_cliente v
            JOIN microempresa m ON v.microempresa_id = m.id_microempresa
            WHERE v.cliente_id = ?
            ORDER BY v.fecha_visita DESC
            LIMIT 10`,
            [clienteId]
        );

        res.json(visitas);
    } catch (error) {
        console.error("❌ Error obteniendo historial:", error);
        res.status(500).json({ 
            message: "Error al obtener historial de visitas",
            error: error.message 
        });
    }
};

// ACTUALIZAR PERFIL DE CLIENTE
exports.actualizarPerfilCliente = async (req, res) => {
    const { clienteId } = req.params;
    const { nombre, telefono } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    try {
        // Verificar que el cliente está autenticado y es el dueño del perfil
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.id !== parseInt(clienteId) || decoded.tipo !== 'cliente_publico') {
            return res.status(403).json({ 
                message: "No autorizado para actualizar este perfil" 
            });
        }

        await db.execute(
            'UPDATE cliente SET nombre_razon_social = ?, telefono = ? WHERE id_cliente = ?',
            [nombre, telefono, clienteId]
        );

        res.json({ 
            message: "Perfil actualizado exitosamente" 
        });

    } catch (error) {
        console.error("❌ Error actualizando perfil:", error);
        res.status(500).json({ 
            message: "Error al actualizar perfil",
            error: error.message 
        });
    }
};

// SOLICITAR RESET DE CONTRASEÑA
exports.solicitarResetPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const [clientes] = await db.execute(
            'SELECT id_cliente, nombre_razon_social, email FROM cliente WHERE email = ? AND origen = "publico"',
            [email]
        );

        if (clientes.length === 0) {
            // Por seguridad, no revelamos si el email existe o no
            return res.json({ 
                message: "Si el email existe, recibirás un enlace para resetear tu contraseña" 
            });
        }

        const cliente = clientes[0];
        
        // Generar token de reset (en un sistema real, enviarías un email)
        const resetToken = jwt.sign(
            { id: cliente.id_cliente, tipo: 'reset_password' },
            process.env.JWT_SECRET + cliente.password, // Usar password como parte del secreto
            { expiresIn: '1h' }
        );

        // Guardar token en la base de datos
        await db.execute(
            'UPDATE cliente SET token_reset = ?, token_expira = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id_cliente = ?',
            [resetToken, cliente.id_cliente]
        );

        // En un sistema real, aquí enviarías un email con el enlace
        // Para desarrollo, devolvemos el token
        res.json({ 
            message: "Si el email existe, recibirás un enlace para resetear tu contraseña",
            resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
        });

    } catch (error) {
        console.error("❌ Error solicitando reset:", error);
        res.status(500).json({ 
            message: "Error al procesar la solicitud",
            error: error.message 
        });
    }
};