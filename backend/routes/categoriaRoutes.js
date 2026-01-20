const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoriaController');
const { verifyToken } = require('../middleware/auth');

// Rutas para administradores
router.post('/', verifyToken, categoriaController.createCategoria);
router.get('/empresa', verifyToken, categoriaController.getCategoriasByEmpresa);
router.put('/:id', verifyToken, categoriaController.updateCategoria);
router.delete('/:id', verifyToken, categoriaController.deleteCategoria);

// Ruta pública para el portal
router.get('/public/:microempresaId', categoriaController.getCategoriasPublic);

module.exports = router;