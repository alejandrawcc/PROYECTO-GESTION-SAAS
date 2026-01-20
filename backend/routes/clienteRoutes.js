const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { verifyToken } = require('../middleware/auth');

// 1. Rutas Generales (sin ID)
router.get('/', verifyToken, clienteController.getClientes);
router.post('/', verifyToken, clienteController.createCliente);

// 2. Ruta Especial (Lista de empresas para el select)
router.get('/lista-empresas', verifyToken, clienteController.getListaEmpresasParaSelector);

// 3. RUTA DEL INTERRUPTOR (¡IMPORTANTE! Debe ir ANTES de /:id)
// Si pones esto abajo, Express creerá que "toggle" es un ID y fallará.
router.put('/:id/toggle', verifyToken, clienteController.toggleEstado);

// 4. Rutas con ID (Editar y Eliminar)
router.put('/:id', verifyToken, clienteController.updateCliente);
router.delete('/:id', verifyToken, clienteController.deleteCliente);

module.exports = router;