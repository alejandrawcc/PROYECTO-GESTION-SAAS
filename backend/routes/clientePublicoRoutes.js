const express = require('express');
const router = express.Router();
const clientePublicoController = require('../controllers/clientePublicoController');

// Rutas públicas (sin autenticación)
router.post('/registrar', clientePublicoController.registrarClientePublico);
router.post('/login', clientePublicoController.loginClientePublico);
router.get('/verify', clientePublicoController.verifyClienteToken);
router.get('/microempresas', clientePublicoController.getMicroempresasActivas);
router.post('/solicitar-reset', clientePublicoController.solicitarResetPassword);

// Rutas protegidas (requieren token de cliente)
router.post('/visita', clientePublicoController.registrarVisita);
router.get('/:clienteId/historial', clientePublicoController.getHistorialVisitas);
router.put('/:clienteId/perfil', clientePublicoController.actualizarPerfilCliente);

module.exports = router;