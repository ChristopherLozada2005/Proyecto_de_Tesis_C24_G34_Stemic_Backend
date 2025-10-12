const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluationController');
const { authenticateToken } = require('../middleware/auth');

// Obtener preguntas de evaluación (público)
router.get('/preguntas-evaluaciones', evaluationController.getEvaluationQuestions);

// Verificar si un usuario puede evaluar un evento
router.get('/evaluaciones/can-evaluate/:evento_id', authenticateToken, evaluationController.canEvaluateEvent);

// Crear evaluación
router.post('/evaluaciones', authenticateToken, evaluationController.createEvaluation);

// Obtener evaluaciones del usuario autenticado
router.get('/evaluaciones/user', authenticateToken, evaluationController.getUserEvaluations);

// Obtener evaluaciones de un evento específico (solo creador del evento)
router.get('/evaluaciones/event/:evento_id', authenticateToken, evaluationController.getEventEvaluations);

// Obtener estadísticas de evaluaciones de un evento (solo creador del evento)
router.get('/evaluaciones/stats/:evento_id', authenticateToken, evaluationController.getEventStats);

module.exports = router;
