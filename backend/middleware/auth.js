const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ message: "Acceso denegado. Token requerido." });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: "Acceso denegado. Token requerido." });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(401).json({ message: "Token inválido o expirado" });
    }
};

module.exports = { verifyToken };