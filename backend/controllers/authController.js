const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTRO DE USUARIO
exports.registrar = async (req, res) => {
    const { nombre, apellido, email, password, microempresa_id, rol_id, empresa } = req.body;
    
    try {
        // Verificar si el usuario ya existe
        const [existe] = await db.execute('SELECT * FROM USUARIO WHERE email = ?', [email]);
        if (existe.length > 0) {
            return res.status(400).json({ message: "El correo ya está registrado" });
        }

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let empresaIdFinal = microempresa_id;

        // Si es Administrador (rol_id = 2) y viene con datos de empresa, crear la microempresa
        if (parseInt(rol_id) === 2 && empresa) {
            try {
                // plan_id debe ser un número (INT), usar 1 para plan "Free" por defecto
                // Según plan_pago: id_plan 1=Free, 2=Basico, 3=Premium
                // Validar que plan_id sea un número válido, si no usar 1 (plan Free)
                let planIdFinal = 1; // Por defecto plan_id = 1 (Free)
                if (empresa.plan_id) {
                    const planIdParsed = parseInt(empresa.plan_id);
                    // Solo usar si es un número válido (no NaN)
                    if (!isNaN(planIdParsed) && planIdParsed > 0) {
                        planIdFinal = planIdParsed;
                    }
                }
                
                // Intentar con estado primero, si falla intentar sin estado (dejar que use el default)
                let result;
                try {
                    // Intentar insertar con estado
                    [result] = await db.execute(
                        `INSERT INTO MICROEMPRESA 
                        (nombre, nit, direccion, rubro, descripcion, telefono, email, moneda, estado, fecha_registro, plan_id) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'activo', NOW(), ?)`,
                        [
                            empresa.nombre,
                            empresa.nit,
                            empresa.direccion,
                            empresa.rubro || null,
                            empresa.descripcion || null,
                            empresa.telefono,
                            empresa.email || email, // Email del administrador
                            empresa.moneda || 'USD',
                            planIdFinal // Usar número en lugar de string
                        ]
                    );
                } catch (estadoError) {
                    // Si falla con estado, intentar sin estado (usar default)
                    console.log('Intentando insertar sin campo estado...');
                    [result] = await db.execute(
                        `INSERT INTO MICROEMPRESA 
                        (nombre, nit, direccion, rubro, descripcion, telefono, email, moneda, fecha_registro, plan_id) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
                        [
                            empresa.nombre,
                            empresa.nit,
                            empresa.direccion,
                            empresa.rubro || null,
                            empresa.descripcion || null,
                            empresa.telefono,
                            empresa.email || email, // Email del administrador
                            empresa.moneda || 'USD',
                            planIdFinal // Usar número en lugar de string
                        ]
                    );
                }
                empresaIdFinal = result.insertId;
            } catch (error) {
                console.error('Error al crear microempresa:', error);
                console.error('SQL Error completo:', error.sqlMessage);
                // Calcular planIdFinal para el log
                let planIdLog = 1;
                if (empresa.plan_id) {
                    const planIdParsed = parseInt(empresa.plan_id);
                    if (!isNaN(planIdParsed) && planIdParsed > 0) {
                        planIdLog = planIdParsed;
                    }
                }
                console.error('Datos enviados:', {
                    nombre: empresa.nombre,
                    nit: empresa.nit,
                    estado: 'activo',
                    plan_id: planIdLog,
                    plan_id_original: empresa.plan_id
                });
                // Mostrar el error real de la base de datos
                const errorMessage = error.message || "Error al crear la microempresa";
                return res.status(500).json({ 
                    message: "Error al crear la microempresa",
                    error: errorMessage,
                    sqlError: error.sqlMessage 
                });
            }
        }

        //Insertar en la base de datos
        await db.execute(
            'INSERT INTO USUARIO (nombre, apellido, email, password, microempresa_id, rol_id) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, apellido, email, hashedPassword, empresaIdFinal || null, rol_id]
        );

        res.status(201).json({ message: "Usuario creado con éxito" });
    } catch (error) {
        console.error('Error en registro:', error);
        // Mostrar el error real de la base de datos
        const errorMessage = error.message || "Error al registrar usuario";
        res.status(500).json({ 
            error: "Error al registrar usuario",
            message: errorMessage,
            sqlError: error.sqlMessage 
        });
    }
};

// LOGIN DE USUARIO
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Buscar usuario y su rol
        const [rows] = await db.execute(
            `SELECT u.*, r.tipo_rol, m.estado as empresa_estado, m.nombre as empresa_nombre
            FROM USUARIO u 
            JOIN ROL r ON u.rol_id = r.id_rol 
            LEFT JOIN MICROEMPRESA m ON u.microempresa_id = m.id_microempresa
            WHERE u.email = ?`, 
            [email]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        const usuario = rows[0];

        // Verificar contraseña
        const validPass = await bcrypt.compare(password, usuario.password);
        if (!validPass) {
            return res.status(401).json({ message: "Contraseña incorrecta" });
        }

        // Verificar si el usuario está activo
        if (usuario.estado === 'inactivo') {
            return res.status(403).json({ message: "Usuario inactivo" });
        }

        // Generar Token JWT
        const token = jwt.sign(
            { 
                id: usuario.id_usuario, 
                rol: usuario.tipo_rol, 
                microempresa_id: usuario.microempresa_id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            usuario: {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                rol: usuario.tipo_rol,
                microempresa_id: usuario.microempresa_id,
                empresa_nombre: usuario.empresa_nombre,
                empresa_estado: usuario.empresa_estado
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en el servidor" });
    }
};

// VERIFICAR TOKEN
exports.verifyToken = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ valid: false, message: "No token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Buscar usuario actualizado
        const [rows] = await db.execute(
            `SELECT u.*, r.tipo_rol, m.estado as empresa_estado 
            FROM USUARIO u 
            JOIN ROL r ON u.rol_id = r.id_rol 
            LEFT JOIN MICROEMPRESA m ON u.microempresa_id = m.id_microempresa
            WHERE u.id_usuario = ?`, 
            [decoded.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ valid: false, message: "Usuario no encontrado" });
        }

        const usuario = rows[0];

        res.json({
            valid: true,
            usuario: {
                id: usuario.id_usuario,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email,
                rol: usuario.tipo_rol,
                microempresa_id: usuario.microempresa_id,
                empresa_estado: usuario.empresa_estado,
                estado: usuario.estado
            }
        });
    } catch (error) {
        res.status(401).json({ valid: false, message: "Token inválido o expirado" });
    }
};

// CERRAR SESIÓN
exports.logout = (req, res) => {
    res.json({ message: "Sesión cerrada exitosamente" });
};

// OBTENER LISTA DE MICROEMPRESAS (para vendedores)
// Cambiamos 'plan_pago' por 'plan_id' o hacemos un JOIN para traer el nombre del plan
exports.getMicroempresas = async (req, res) => {
    try {
        const query = `
            SELECT 
                m.id_microempresa, 
                m.nombre, 
                m.direccion, 
                m.telefono, 
                p.nombre_plan as plan_nombre 
            FROM MICROEMPRESA m
            LEFT JOIN plan_pago p ON m.plan_id = p.id_plan
            WHERE m.estado = 'activa'
            ORDER BY m.nombre
        `;

        const [rows] = await db.execute(query);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};