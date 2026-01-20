const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configurar multer para subida de imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '..', 'uploads', 'productos');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
        }
    }
});

// Rutas para administradores
router.post('/', verifyToken, upload.single('imagen'), productoController.createProducto);
router.get('/empresa', verifyToken, productoController.getProductosByEmpresa);
router.put('/:id', verifyToken, productoController.updateProducto);
router.put('/:id/stock', verifyToken, productoController.updateStock);
router.put('/:id/imagen', verifyToken, upload.single('imagen'), productoController.uploadImagen);
router.delete('/:id', verifyToken, productoController.deleteProducto);
router.get('/notificaciones/stock', verifyToken, productoController.getNotificacionesStock);
router.put('/notificaciones/:id/leida', verifyToken, productoController.marcarNotificacionLeida);

// Rutas públicas para el portal
router.get('/public/:microempresaId', productoController.getProductosPublic);

module.exports = router;