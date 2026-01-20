const db = require('../config/db');
const bcrypt = require('bcryptjs');

// =========================================================
// 1. OBTENER USUARIOS (Modificado: Staff + Clientes)
// =========================================================
const getUsuarios = async (req, res) => {
    try {
        const { rol, id_microempresa } = req.user;

        // 1. PREPARAR PARAMETROS
        const paramsUsuario = [];
        const paramsCliente = [];

        // 2. CONSULTA DE USUARIOS (Staff: Admin, Vendedor, etc)
        // NOTA: Usamos tablas en minúsculas (usuario, rol, microempresa)
        let queryUsuarios = `
            SELECT 
                u.id_usuario, 
                u.nombre, 
                u.apellido, 
                u.email, 
                u.estado, 
                u.fecha_creacion,
                u.rol_id,
                r.tipo_rol,          
                m.nombre AS empresa_nombre 
            FROM usuario u
            JOIN rol r ON u.rol_id = r.id_rol
            LEFT JOIN microempresa m ON u.microempresa_id = m.id_microempresa
        `;

        // 3. CONSULTA DE CLIENTES
        // Mapeamos campos para que coincidan con la estructura visual
        let queryClientes = `
            SELECT 
                c.id_cliente, 
                c.nombre_razon_social as nombre,  
                NULL as razon_social, 
                c.email, 
                c.estado, 
                m.nombre AS empresa_nombre 
            FROM cliente c
            LEFT JOIN microempresa m ON c.microempresa_id = m.id_microempresa
        `;

        // 4. SEGURIDAD (Filtros por rol)
        if (rol === 'administrador') {
            // Admin solo ve su gente y sus clientes
            queryUsuarios += ' WHERE u.microempresa_id = ?';
            paramsUsuario.push(id_microempresa);

            queryClientes += ' WHERE c.microempresa_id = ?';
            paramsCliente.push(id_microempresa);
        } else if (rol === 'vendedor') {
             // Opcional: Bloquear acceso a vendedores o filtrar solo sus datos
             return res.status(403).json({ message: 'Acceso no autorizado' });
        }
        // Super Admin ve todo (no entra en los IF)

        // Ordenamos usuarios por el más reciente
        queryUsuarios += ' ORDER BY u.id_usuario DESC';

        // 5. EJECUTAR CONSULTAS EN PARALELO
        console.log("Cargando usuarios y clientes...");
        const [usuariosResult] = await db.query(queryUsuarios, paramsUsuario);
        const [clientesResult] = await db.query(queryClientes, paramsCliente);

        // 6. FORMATEAR CLIENTES PARA LA LISTA UNIFICADA
        const clientesFormateados = clientesResult.map(c => ({
            id_usuario: `cli-${c.id_cliente}`, // ID ficticio (string)
            nombre: c.nombre,
            apellido: c.razon_social || '(Cliente)', 
            email: c.email || 'Sin email',
            estado: c.estado,
            fecha_creacion: null, 
            tipo_rol: 'cliente',  // Rol visual "cliente"
            rol_id: 4,            // ID de rol 4 (asumiendo que 4 es cliente)
            empresa_nombre: c.empresa_nombre,
            es_cliente_externo: true // Bandera interna
        }));

        // 7. UNIR Y RESPONDER
        const listaCompleta = [...usuariosResult, ...clientesFormateados];
        console.log(`Total cargados: ${listaCompleta.length}`);
        
        res.json(listaCompleta);

    } catch (error) {
        console.error("❌ Error en getUsuarios:", error);
        res.status(500).json({ message: 'Error al cargar la lista unificada' });
    }
};

// =========================================================
// 2. LISTAR EMPRESAS (Para el Select de Filtro en Frontend)
// =========================================================
const getListaEmpresas = async (req, res) => {
    try {
        // Tabla en minúscula: microempresa
        const [rows] = await db.execute('SELECT id_microempresa, nombre FROM microempresa ORDER BY nombre ASC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// =========================================================
// 3. CREAR USUARIO
// =========================================================
const createUsuario = async (req, res) => {
    const { nombre, apellido, email, password, rol_id } = req.body;
    
    try {
        // 1. Validar correo duplicado (tabla usuario)
        const [existe] = await db.execute('SELECT id_usuario FROM usuario WHERE email = ?', [email]);
        if (existe.length > 0) {
            return res.status(400).json({ message: "El correo ya está registrado" });
        }

        let microempresa_id = req.user.microempresa_id;
        
        // 2. Asignación de empresa (Super Admin puede elegir)
        if (req.user.rol === 'super_admin' && req.body.microempresa_id) {
            microempresa_id = req.body.microempresa_id;
        }

        // 3. Restricción de creación de roles
        if (rol_id == 1 && req.user.rol !== 'super_admin') {
            return res.status(403).json({ message: "No puedes crear usuarios super admin" });
        }

        // 4. Hash del password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 5. Insertar (tabla usuario)
        await db.execute(
            'INSERT INTO usuario (nombre, apellido, email, password, microempresa_id, rol_id) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, apellido, email, hashedPassword, microempresa_id, rol_id]
        );

        res.status(201).json({ message: "Usuario creado con éxito" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear usuario" });
    }
};

// =========================================================
// 4. EDITAR USUARIO (Incluye renombrar empresa)
// =========================================================
const updateUsuario = async (req, res) => {
    const { id } = req.params;
    
    // Si intentan editar un cliente (ID empieza con "cli-"), rechazamos
    if (String(id).startsWith('cli-')) {
        return res.status(400).json({ message: "Edita los clientes en el módulo de Clientes" });
    }

    const { nombre, apellido, email, password, rol_id, nombre_empresa } = req.body;

    try {
        // 1. Obtener datos actuales (tabla usuario)
        const [users] = await db.execute('SELECT * FROM usuario WHERE id_usuario = ?', [id]);
        if (users.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });
        const usuarioTarget = users[0];

        // 2. Validar Permisos
        if (req.user.rol !== 'super_admin') {
            if (usuarioTarget.microempresa_id !== req.user.microempresa_id) {
                return res.status(403).json({ message: "No tienes permiso para editar este usuario." });
            }
        }

        // 3. Validar Email Duplicado
        const [emailCheck] = await db.execute(
            'SELECT id_usuario FROM usuario WHERE email = ? AND id_usuario != ?', 
            [email, id]
        );
        if (emailCheck.length > 0) {
            return res.status(400).json({ message: "El correo ya está en uso." });
        }

        // --- 4. ACTUALIZAR NOMBRE EMPRESA (Si aplica) ---
        if (nombre_empresa && usuarioTarget.microempresa_id) {
            if (req.user.rol === 'super_admin') {
                // Tabla microempresa
                await db.execute(
                    'UPDATE microempresa SET nombre = ? WHERE id_microempresa = ?',
                    [nombre_empresa, usuarioTarget.microempresa_id]
                );
            }
        }

        // 5. Actualizar Usuario
        let query = 'UPDATE usuario SET nombre=?, apellido=?, email=?, rol_id=?';
        let params = [nombre, apellido, email, rol_id];

        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query += ', password=?';
            params.push(hashedPassword);
        }

        query += ' WHERE id_usuario=?';
        params.push(id);

        await db.execute(query, params);

        res.json({ message: "Datos actualizados correctamente" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar usuario" });
    }
};

// =========================================================
// 5. ACTUALIZAR ESTADO (Activar/Desactivar)
// =========================================================
const updateEstado = async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body; 

    // Bloquear si es cliente
    if (String(id).startsWith('cli-')) {
        return res.status(400).json({ message: "Cambia el estado desde el módulo de Clientes" });
    }

    try {
        const [usuario] = await db.execute(
            'SELECT microempresa_id, rol_id FROM usuario WHERE id_usuario = ?',
            [id]
        );

        if (usuario.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Seguridad
        if (req.user.rol !== 'super_admin') {
            if (usuario[0].microempresa_id !== req.user.microempresa_id) {
                return res.status(403).json({ message: "No puedes modificar usuarios de otra empresa" });
            }
            if (usuario[0].rol_id == 1) {
                return res.status(403).json({ message: "No puedes modificar al super admin" });
            }
        }

        await db.execute(
            'UPDATE usuario SET estado = ? WHERE id_usuario = ?',
            [estado, id]
        );

        res.json({ message: `Estado actualizado a ${estado}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// =========================================================
// 6. ACTUALIZAR PERFIL (Usuario logueado)
// =========================================================
const actualizarPerfil = async (req, res) => {
    try {
        const { nombre, apellido, telefono } = req.body;
        const id_usuario = req.user.id; 
        let foto_url = null;

        if (req.file) {
            foto_url = req.file.filename;
        }

        let query;
        let params;

        if (foto_url) {
            query = 'UPDATE usuario SET nombre = ?, apellido = ?, telefono = ?, foto_url = ? WHERE id_usuario = ?';
            params = [nombre, apellido, telefono, foto_url, id_usuario];
        } else {
            query = 'UPDATE usuario SET nombre = ?, apellido = ?, telefono = ? WHERE id_usuario = ?';
            params = [nombre, apellido, telefono, id_usuario];
        }

        await db.execute(query, params);

        res.json({ 
            message: "Perfil actualizado correctamente",
            foto_url: foto_url 
        });

    } catch (error) {
        console.error("Error en actualizarPerfil:", error);
        res.status(500).json({ message: "Error interno al actualizar el perfil" });
    }
};

// EXPORTAR TODO
module.exports = {
    getUsuarios,
    getListaEmpresas,
    createUsuario,
    updateUsuario,
    updateEstado,
    actualizarPerfil
};