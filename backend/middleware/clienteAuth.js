const jwt = require('jsonwebtoken');

const verifyClienteToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ message: "Acceso denegado. Token de cliente requerido." });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: "Acceso denegado. Token de cliente requerido." });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verificar que sea un token de cliente público
        if (verified.tipo !== 'cliente_publico') {
            return res.status(401).json({ message: "Token inválido para cliente" });
        }
        
        req.cliente = verified;
        next();
    } catch (error) {
        res.status(401).json({ message: "Token de cliente inválido o expirado" });
    }
};

module.exports = { verifyClienteToken };