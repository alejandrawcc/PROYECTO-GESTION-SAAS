const db = require('../config/db');

// 1. Obtener todos los planes y contar empresas
exports.getAllPlanes = async (req, res) => {
    try {
        // CORREGIDO: Usamos 'plan_pago' en lugar de 'PLAN'
        const query = `
            SELECT p.*, 
            (SELECT COUNT(*) FROM MICROEMPRESA m WHERE m.plan_id = p.id_plan) as total_empresas
            FROM plan_pago p
        `;
        const [planes] = await db.execute(query);
        res.json(planes);
    } catch (error) {
        console.error("Error en getAllPlanes:", error);
        res.status(500).json({ error: "Error al obtener planes" });
    }
};

// 2. Editar un Plan
exports.updatePlan = async (req, res) => {
    const { id } = req.params;
    const { nombre_plan, precio, limite_usuarios, limite_productos, estado } = req.body;

    try {
        // CORREGIDO: Usamos 'plan_pago'
        await db.execute(
            'UPDATE plan_pago SET nombre_plan=?, precio=?, limite_usuarios=?, limite_productos=?, estado=? WHERE id_plan=?',
            [nombre_plan, precio, limite_usuarios, limite_productos, estado, id]
        );
        res.json({ message: "Plan actualizado correctamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar el plan" });
    }
};

// 3. Ver empresas por plan (Esta parte ya estaba bien, consulta MICROEMPRESA)
// 3. Ver qué empresas tienen un plan específico
exports.getEmpresasPorPlan = async (req, res) => {
    const { id } = req.params; 
    try {
        // CORRECCIÓN: Cambiamos 'email_contacto' por 'email' (que es como se llama en tu BD)
        const query = `
            SELECT id_microempresa, nombre, email 
            FROM MICROEMPRESA 
            WHERE plan_id = ?
        `;
        const [empresas] = await db.execute(query, [id]);
        res.json(empresas);
    } catch (error) {
        console.error("Error obteniendo empresas del plan:", error);
        res.status(500).json({ error: "Error al obtener empresas del plan" });
    }
};

// ... (Tus otras funciones getAllPlanes, updatePlan, getEmpresasPorPlan) ...

// 4. NUEVA FUNCIÓN: Asignar Plan a Empresa (Solo Super Admin)
exports.asignarPlanEmpresa = async (req, res) => {
    const { id_microempresa, id_plan } = req.body;

    // Validación básica
    if (!id_microempresa || !id_plan) {
        return res.status(400).json({ message: "Faltan datos (empresa o plan)" });
    }

    try {
        // Verificar que el plan existe
        const [planes] = await db.execute('SELECT nombre_plan FROM plan_pago WHERE id_plan = ?', [id_plan]);
        if (planes.length === 0) return res.status(404).json({ message: "El plan seleccionado no existe" });
        
        // Actualizar la empresa
        await db.execute(
            'UPDATE MICROEMPRESA SET plan_id = ? WHERE id_microempresa = ?',
            [id_plan, id_microempresa]
        );

        res.json({ message: `Empresa movida al plan ${planes[0].nombre_plan} correctamente` });

    } catch (error) {
        console.error("Error asignando plan:", error);
        res.status(500).json({ error: "Error al cambiar el plan de la empresa" });
    }
};