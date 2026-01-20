const db = require('../config/db');

exports.getDashboardStats = async (req, res) => {
    const { periodo } = req.query; // 'hoy', 'semana', 'mes'
    const microempresa_id = req.user.microempresa_id;
    const rol = req.user.rol;

    let dateCondition = "";
    if (periodo === 'hoy') dateCondition = "AND DATE(fecha) = CURDATE()";
    else if (periodo === 'semana') dateCondition = "AND YEARWEEK(fecha, 1) = YEARWEEK(CURDATE(), 1)";
    else if (periodo === 'mes') dateCondition = "AND MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())";

    try {
        // 1. Total Ventas (Suma de la columna 'total' de tu tabla 'pedido')
        // Si es super_admin, ve global, si no, filtrado por empresa
        const queryVentas = rol === 'super_admin' 
            ? `SELECT SUM(total) as total FROM pedido WHERE 1=1 ${dateCondition}`
            : `SELECT SUM(total) as total FROM pedido p 
               JOIN USUARIO u ON p.usuario_id = u.id_usuario 
               WHERE u.microempresa_id = ? ${dateCondition}`;
        
        const [ventas] = await db.execute(queryVentas, rol === 'super_admin' ? [] : [microempresa_id]);

        // 2. Conteo de Clientes
        const [clientes] = await db.execute(
            rol === 'super_admin' ? 'SELECT COUNT(*) as total FROM CLIENTE' : 'SELECT COUNT(*) as total FROM CLIENTE WHERE microempresa_id = ?',
            rol === 'super_admin' ? [] : [microempresa_id]
        );

        res.json({
            ventasTotales: ventas[0].total || 0,
            clientesTotales: clientes[0].total || 0,
            periodoActual: periodo
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};