const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();

// --- 1. CONFIGURACIÓN DE CARPETAS ---
const uploadDir = path.join(__dirname, 'uploads');
const productosDir = path.join(__dirname, 'uploads/productos');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
    console.log('📁 Carpeta /uploads creada automáticamente');
}

if (!fs.existsSync(productosDir)) {
    fs.mkdirSync(productosDir, { recursive: true });
    console.log('📁 Carpeta /uploads/productos creada automáticamente');
}

// --- 2. MIDDLEWARES ---

app.use('/uploads/productos', express.static(path.join(__dirname, 'uploads/productos')));

// Servir archivos estáticos (para fotos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración de CORS
app.use(cors({
    origin: ['http://localhost:5174', 'http://localhost:5173', 'http://127.0.0.1:5174'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parsear JSON y formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 3. IMPORTAR RUTAS ---
const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const passwordRoutes = require('./routes/passwordRoutes');
const clienteRoutes = require('./routes/clienteRoutes');
const planRoutes = require('./routes/planRoutes');      
const suscripcionRoutes = require('./routes/suscripcionRoutes');
const categoriaRoutes = require('./routes/categoriaRoutes');     
const productoRoutes = require('./routes/productoRoutes');       
const portalRoutes = require('./routes/portalRoutes');  
const clientePublicoRoutes = require('./routes/clientePublicoRoutes');

// --- 4. USO DE RUTAS ---
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/planes', planRoutes);      
app.use('/api/suscripciones', suscripcionRoutes); 
app.use('/api/categorias', categoriaRoutes);     
app.use('/api/productos', productoRoutes);    
app.use('/api/portal', portalRoutes); 
app.use('/api/clientes-publico', clientePublicoRoutes);

// --- 5. ENDPOINTS DE PRUEBA ---
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Backend funcionando ✅',
        timestamp: new Date().toISOString(),
        port: process.env.PORT
    });
});

// --- 6. INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`\n🚀 ==========================================`);
    console.log(`✅ Servidor backend corriendo en:`);
    console.log(`   Punto de acceso: http://localhost:${PORT}`);
    console.log(`   Carpeta uploads: http://localhost:${PORT}/uploads`);
    console.log(`✅ Endpoints activos: Auth, Usuarios, Clientes, Planes, Pagos`);
    console.log(`🚀 ==========================================\n`);
});