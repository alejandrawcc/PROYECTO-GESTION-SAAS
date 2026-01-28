const db = require('../config/db');

exports.getDashboardStats = async (req, res) => {
    const { periodo } = req.query; // 'hoy', 'semana', 'mes', 'anio', 'todos'
    const { rol, microempresa_id, id: usuario_id } = req.user;

    console.log(`📊 Solicitando stats para:`, {
        periodo,
        rol,
        microempresa_id,
        usuario_id
    });

    try {
        // Configurar filtro de fecha según periodo
        let fechaFiltro = '';
        switch (periodo) {
            case 'hoy':
                fechaFiltro = "AND DATE(fecha) = CURDATE()";
                break;
            case 'semana':
                fechaFiltro = "AND YEARWEEK(fecha, 1) = YEARWEEK(CURDATE(), 1)";
                break;
            case 'mes':
                fechaFiltro = "AND MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())";
                break;
            case 'anio':
                fechaFiltro = "AND YEAR(fecha) = YEAR(CURDATE())";
                break;
            default:
                fechaFiltro = ""; // Todos
        }

        console.log(`📅 Filtro de fecha: ${fechaFiltro}`);

        let ventasStats = {};
        let comprasStats = {};
        let inventarioStats = {};
        let ventasPorEmpleado = [];
        let ventasRecientes = [];
        let productosMasVendidos = [];
        let evolucionVentas = [];

        // 1. ESTADÍSTICAS DE VENTAS
        if (rol === 'super_admin') {
            // Super Admin ve todo
            const [ventasResult] = await db.execute(`
                SELECT 
                    COUNT(*) as total_ventas,
                    COALESCE(SUM(total), 0) as total_ingresos,
                    COALESCE(AVG(total), 0) as promedio_venta,
                    COUNT(DISTINCT cliente_id) as clientes_atendidos
                FROM pedido 
                WHERE 1=1 ${fechaFiltro}
            `);
            
            ventasStats = ventasResult[0] || {};
            
            // Total de empresas activas para super admin
            const [empresasResult] = await db.execute(
                `SELECT COUNT(*) as empresas_activas FROM microempresa WHERE estado = 'activa'`
            );
            ventasStats.empresas_activas = empresasResult[0]?.empresas_activas || 0;
            
            // Total de usuarios activos
            const [usuariosResult] = await db.execute(
                `SELECT COUNT(*) as usuarios_activos FROM usuario WHERE estado = 'activo'`
            );
            ventasStats.usuarios_activos = usuariosResult[0]?.usuarios_activos || 0;
            
        } else {
            // Admin/Vendedor filtrado por microempresa
            // Primero verificar la microempresa del usuario
            const [userEmpresa] = await db.execute(
                `SELECT microempresa_id FROM usuario WHERE id_usuario = ?`,
                [usuario_id]
            );
            
            const empresaId = userEmpresa[0]?.microempresa_id || microempresa_id;
            
            console.log(`🏢 ID Empresa del usuario: ${empresaId}`);
            
            // Estadísticas de ventas para la empresa
            const [ventasResult] = await db.execute(`
                SELECT 
                    COUNT(*) as total_ventas,
                    COALESCE(SUM(total), 0) as total_ingresos,
                    COALESCE(AVG(total), 0) as promedio_venta
                FROM pedido p
                JOIN usuario u ON p.usuario_id = u.id_usuario
                WHERE u.microempresa_id = ? ${fechaFiltro}
            `, [empresaId]);
            
            ventasStats = ventasResult[0] || {};
            
            // Clientes atendidos
            const [clientesResult] = await db.execute(`
                SELECT COUNT(DISTINCT p.cliente_id) as clientes_atendidos
                FROM pedido p
                JOIN usuario u ON p.usuario_id = u.id_usuario
                WHERE u.microempresa_id = ? ${fechaFiltro}
            `, [empresaId]);
            
            ventasStats.clientes_atendidos = clientesResult[0]?.clientes_atendidos || 0;
            
            // 2. ESTADÍSTICAS DE COMPRAS (solo para administradores)
            if (rol !== 'vendedor') {
                const [comprasResult] = await db.execute(
                    `SELECT 
                        COUNT(*) as total_compras,
                        COALESCE(SUM(total), 0) as total_gastos
                    FROM compra 
                    WHERE id_microempresa = ? ${fechaFiltro}`,
                    [empresaId]
                );
                comprasStats = comprasResult[0] || {};
            }

            // 3. ESTADÍSTICAS DE INVENTARIO
            const [inventarioResult] = await db.execute(
                `SELECT 
                    COUNT(*) as total_productos,
                    SUM(CASE WHEN stock_actual <= stock_minimo THEN 1 ELSE 0 END) as productos_bajo_stock,
                    SUM(CASE WHEN stock_actual = 0 THEN 1 ELSE 0 END) as productos_agotados,
                    SUM(stock_actual) as stock_total
                FROM producto 
                WHERE microempresa_id = ? AND estado = 'stock'`,
                [empresaId]
            );
            inventarioStats = inventarioResult[0] || {};

            // 4. VENTAS POR EMPLEADO (solo para administradores)
            if (rol === 'administrador' || rol === 'super_admin') {
                const [empleadosResult] = await db.execute(
                    `SELECT 
                        u.id_usuario,
                        u.nombre,
                        u.apellido,
                        COUNT(p.id_pedido) as total_ventas,
                        COALESCE(SUM(p.total), 0) as total_ingresos,
                        COALESCE(AVG(p.total), 0) as promedio_venta
                    FROM usuario u
                    LEFT JOIN pedido p ON u.id_usuario = p.usuario_id 
                        AND u.microempresa_id = ? 
                        ${fechaFiltro}
                    WHERE u.microempresa_id = ? 
                        AND u.rol_id IN (3, 4, 2) -- vendedores, administradores
                    GROUP BY u.id_usuario
                    ORDER BY total_ingresos DESC`,
                    [empresaId, empresaId]
                );
                ventasPorEmpleado = empleadosResult;
            }

            // 5. VENTAS RECIENTES (últimas 5 ventas)
            const [recientesResult] = await db.execute(
                `SELECT 
                    p.id_pedido,
                    p.fecha,
                    p.total,
                    p.metodo_pago,
                    p.estado,
                    c.nombre_razon_social as cliente_nombre,
                    CONCAT(u.nombre, ' ', u.apellido) as vendedor_nombre
                FROM pedido p
                LEFT JOIN cliente c ON p.cliente_id = c.id_cliente
                LEFT JOIN usuario u ON p.usuario_id = u.id_usuario
                WHERE u.microempresa_id = ?
                ORDER BY p.fecha DESC
                LIMIT 5`,
                [empresaId]
            );
            ventasRecientes = recientesResult;

            // 6. PRODUCTOS MÁS VENDIDOS
            const [productosResult] = await db.execute(
                `SELECT 
                    pr.nombre as producto_nombre,
                    SUM(dp.cantidad) as total_vendido,
                    SUM(dp.subtotal) as ingreso_total
                FROM detalle_pedido dp
                JOIN pedido p ON dp.pedido_id = p.id_pedido
                JOIN producto pr ON dp.producto_id = pr.id_producto
                JOIN usuario u ON p.usuario_id = u.id_usuario
                WHERE u.microempresa_id = ? ${fechaFiltro}
                GROUP BY pr.id_producto
                ORDER BY total_vendido DESC
                LIMIT 5`,
                [empresaId]
            );
            productosMasVendidos = productosResult;

            // 7. EVOLUCIÓN DE VENTAS (últimos 7 días)
            const [evolucionResult] = await db.execute(
                `SELECT 
                    DATE(p.fecha) as fecha,
                    COUNT(*) as cantidad_ventas,
                    COALESCE(SUM(p.total), 0) as total_dia
                FROM pedido p
                JOIN usuario u ON p.usuario_id = u.id_usuario
                WHERE u.microempresa_id = ? 
                    AND p.fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                GROUP BY DATE(p.fecha)
                ORDER BY fecha ASC`,
                [empresaId]
            );
            evolucionVentas = evolucionResult;
        }

        // Calcular balance y rentabilidad
        const totalIngresos = parseFloat(ventasStats.total_ingresos || 0);
        const totalGastos = parseFloat(comprasStats.total_gastos || 0);
        const balance = totalIngresos - totalGastos;
        const rentabilidad = totalGastos > 0 ? ((balance / totalGastos) * 100) : 0;

        console.log(`✅ Stats calculados:`, {
            ventas: ventasStats.total_ventas || 0,
            ingresos: totalIngresos,
            gastos: totalGastos,
            balance,
            rentabilidad
        });

        res.json({
            periodo: periodo || 'todos',
            ventas: {
                total_ingresos: totalIngresos,
                total_ventas: parseInt(ventasStats.total_ventas || 0),
                promedio_venta: parseInt(ventasStats.total_ventas || 0) > 0 
                    ? totalIngresos / parseInt(ventasStats.total_ventas || 0) 
                    : 0,
                clientes_atendidos: parseInt(ventasStats.clientes_atendidos || 0),
                empresas_activas: parseInt(ventasStats.empresas_activas || 0),
                usuarios_activos: parseInt(ventasStats.usuarios_activos || 0)
            },
            compras: {
                total_gastos: totalGastos,
                total_compras: parseInt(comprasStats.total_compras || 0)
            },
            inventario: {
                total_productos: parseInt(inventarioStats.total_productos || 0),
                productos_bajo_stock: parseInt(inventarioStats.productos_bajo_stock || 0),
                productos_agotados: parseInt(inventarioStats.productos_agotados || 0),
                stock_total: parseInt(inventarioStats.stock_total || 0)
            },
            ventas_por_empleado: ventasPorEmpleado,
            ventas_recientes: ventasRecientes,
            productos_mas_vendidos: productosMasVendidos,
            evolucion_ventas: evolucionVentas,
            resumen: {
                balance: balance,
                rentabilidad: parseFloat(rentabilidad.toFixed(2))
            }
        });

    } catch (error) {
        console.error("❌ Error en getDashboardStats:", error);
        console.error("Stack trace:", error.stack);
        res.status(500).json({ 
            error: "Error al obtener estadísticas",
            details: error.message,
            sqlError: error.sqlMessage 
        });
    }
};

// Agregar esta función para debug
exports.debugVentas = async (req, res) => {
    try {
        const { microempresa_id } = req.user;
        
        console.log(`🔍 Debug para microempresa: ${microempresa_id}`);
        
        // Verificar pedidos en la base de datos
        const [pedidos] = await db.execute(`
            SELECT 
                p.*,
                u.nombre as vendedor_nombre,
                c.nombre_razon_social as cliente_nombre
            FROM pedido p
            LEFT JOIN usuario u ON p.usuario_id = u.id_usuario
            LEFT JOIN cliente c ON p.cliente_id = c.id_cliente
            WHERE u.microempresa_id = ?
            ORDER BY p.fecha DESC
            LIMIT 10
        `, [microempresa_id]);
        
        // Verificar usuarios de la empresa
        const [usuarios] = await db.execute(`
            SELECT id_usuario, nombre, apellido, rol_id 
            FROM usuario 
            WHERE microempresa_id = ?
        `, [microempresa_id]);
        
        // Verificar productos de la empresa
        const [productos] = await db.execute(`
            SELECT COUNT(*) as total, 
                   SUM(stock_actual) as stock_total
            FROM producto 
            WHERE microempresa_id = ?
        `, [microempresa_id]);
        
        res.json({
            pedidos,
            usuarios,
            productos: productos[0],
            total_pedidos: pedidos.length,
            debug_info: {
                microempresa_id,
                fecha_actual: new Date().toISOString(),
                query_time: new Date().toLocaleTimeString()
            }
        });
        
    } catch (error) {
        console.error("❌ Error en debug:", error);
        res.status(500).json({ error: error.message });
    }
};