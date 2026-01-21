const express = require('express');
const router = express.Router();
const portalController = require('../controllers/portalController');
const { verifyClienteToken } = require('../middleware/clienteAuth'); // Nueva

// Rutas públicas del portal
router.get('/:microempresaId', portalController.getPortalData);
router.get('/:microempresaId/categoria/:categoria', portalController.getProductosByCategoria);
router.get('/:microempresaId/search', portalController.searchProductos);

// Ruta para registrar visita (requiere token de cliente)
router.post('/:microempresaId/visitar', verifyClienteToken, async (req, res) => {
    try {
        const { microempresaId } = req.params;
        const clienteId = req.cliente.id;
        
        // Llamar al controlador de visitas
        const visitaController = require('../controllers/clientePublicoController');
        
        // Crear un objeto req/res falso para el controlador
        const fakeReq = { body: { cliente_id: clienteId, microempresa_id: microempresaId } };
        const fakeRes = {
            json: (data) => res.json(data),
            status: (code) => ({ json: (data) => res.status(code).json(data) })
        };
        
        await visitaController.registrarVisita(fakeReq, fakeRes);
        
    } catch (error) {
        console.error("Error registrando visita desde portal:", error);
        res.status(500).json({ error: "Error al registrar visita" });
    }
});

module.exports = router;