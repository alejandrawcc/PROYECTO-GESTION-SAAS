const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const { verifyToken } = require('../middleware/auth');

router.get('/', planController.getAllPlanes);
router.get('/:id/empresas', verifyToken, planController.getEmpresasPorPlan);
router.put('/:id', verifyToken, planController.updatePlan);

// --- NUEVA RUTA: CAMBIAR PLAN A UNA EMPRESA ---
router.post('/asignar', verifyToken, planController.asignarPlanEmpresa);
// ----------------------------------------------

module.exports = router;