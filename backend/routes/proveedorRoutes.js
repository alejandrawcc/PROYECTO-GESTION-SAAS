const express = require('express');
const router = express.Router();
const proveedorController = require('../controllers/proveedorController');
const { verifyToken } = require('../middleware/auth');

// Rutas protegidas
router.post('/', verifyToken, proveedorController.createProveedor);
router.get('/', verifyToken, proveedorController.getProveedoresByEmpresa);
router.get('/search', verifyToken, proveedorController.searchProveedores);
router.get('/select', verifyToken, proveedorController.getProveedoresForSelect);
router.get('/inactivos', verifyToken, proveedorController.getProveedoresInactivos);
router.get('/:id', verifyToken, proveedorController.getProveedorById);
router.put('/:id', verifyToken, proveedorController.updateProveedor);
router.put('/:id/estado', verifyToken, proveedorController.toggleEstadoProveedor);

module.exports = router;