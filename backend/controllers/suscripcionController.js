const db = require('../config/db');

exports.cambiarPlan = async (req, res) => {
    const { nuevo_plan_id } = req.body;
    const microempresa_id = req.user.microempresa_id;

    if (!microempresa_id) {
        return res.status(400).json({ message: "No tienes una empresa asociada." });
    }

    try {
        // CORREGIDO: Buscamos en 'plan_pago'
        const [planes] = await db.execute('SELECT * FROM plan_pago WHERE id_plan = ?', [nuevo_plan_id]);
        
        if (planes.length === 0) return res.status(404).json({ message: "Plan no encontrado" });
        const plan = planes[0];

        // Actualizamos la microempresa con el nuevo ID de plan
        await db.execute(
            `UPDATE MICROEMPRESA SET plan_id = ? WHERE id_microempresa = ?`,
            [nuevo_plan_id, microempresa_id]
        );

        res.json({ 
            message: `¡Pago exitoso! Plan cambiado a ${plan.nombre_plan}`,
            nuevo_plan: plan.nombre_plan
        });

    } catch (error) {
        console.error("Error en cambiarPlan:", error);
        res.status(500).json({ error: "Error procesando la suscripción" });
    }
};