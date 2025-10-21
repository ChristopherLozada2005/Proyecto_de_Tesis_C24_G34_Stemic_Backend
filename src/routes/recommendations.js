const express = require('express');
const router = express.Router();
const RecommendationController = require('../controllers/recommendationController');
const { authenticateToken } = require('../middleware/auth');

// =============================================
// RUTAS DE RECOMENDACIONES
// =============================================

// Obtener eventos recomendados para el usuario autenticado
router.get('/recommendations/events',
  authenticateToken,
  RecommendationController.getRecommendedEvents
);

// Obtener eventos por interés específico
router.get('/recommendations/interest/:interest',
  authenticateToken,
  RecommendationController.getEventsByInterest
);

// Obtener estadísticas de recomendaciones
router.get('/recommendations/stats',
  authenticateToken,
  RecommendationController.getRecommendationStats
);

module.exports = router;
