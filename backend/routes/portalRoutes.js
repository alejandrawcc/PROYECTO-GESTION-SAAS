const express = require('express');
const router = express.Router();
const portalController = require('../controllers/portalController');

router.get('/:microempresaId', portalController.getPortalData);
router.get('/:microempresaId/categoria/:categoria', portalController.getProductosByCategoria);
router.get('/:microempresaId/search', portalController.searchProductos);

module.exports = router;