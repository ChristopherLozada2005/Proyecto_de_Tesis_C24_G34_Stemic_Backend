const express = require('express');
const router = express.Router();
const UserTrackingController = require('../controllers/userTrackingController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleAuth');

// =============================================
// RUTAS DE SEGUIMIENTO DE USUARIOS
// =============================================

// Obtener seguimiento individual completo de un usuario
router.get('/users/:user_id/tracking',
  authenticateToken,
  requireAdmin,
  UserTrackingController.getUserTracking
);

// Obtener resumen de actividad de un usuario
router.get('/users/:user_id/activity',
  authenticateToken,
  requireAdmin,
  UserTrackingController.getUserActivitySummary
);

// Obtener análisis de intereses de un usuario
router.get('/users/:user_id/interests',
  authenticateToken,
  requireAdmin,
  UserTrackingController.getUserInterestsAnalysis
);

module.exports = router;
