const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');
const { verifyToken } = require('../middleware/auth');
// Si usas subida de fotos, importa tu middleware aquí (ej: const upload = require('../middleware/upload'))

// =========================================================
// 1. RUTAS ESTÁTICAS (Sin parámetros :id) - VAN PRIMERO
// =========================================================

// Obtener todos los usuarios (y filtrar según empresa/rol)
router.get('/', verifyToken, usuarioController.getUsuarios);

// Obtener lista de empresas (Para el Select del filtro Super Admin)
// ⚠️ IMPORTANTE: Esta ruta DEBE ir antes de las rutas con /:id
router.get('/lista-empresas', verifyToken, usuarioController.getListaEmpresas);

// Actualizar perfil propio (El usuario se edita a sí mismo)
// ⚠️ IMPORTANTE: "perfil" no es un ID, por eso debe ir antes de /:id
// Si manejas fotos: router.put('/perfil', verifyToken, upload.single('foto'), usuarioController.actualizarPerfil);
router.put('/perfil', verifyToken, usuarioController.actualizarPerfil);

// Crear un nuevo usuario
router.post('/', verifyToken, usuarioController.createUsuario);

// =========================================================
// 2. RUTAS DINÁMICAS (Con parámetros :id) - VAN AL FINAL
// =========================================================

// Cambiar estado de un usuario (Activar/Desactivar)
router.put('/:id/estado', verifyToken, usuarioController.updateEstado);

// Editar un usuario específico (Admin edita a empleado, o Super Admin edita a cualquiera)
// Esta ruta atrapa cualquier cosa como /1, /50, etc. Por eso va al final.
router.put('/:id', verifyToken, usuarioController.updateUsuario);

module.exports = router;