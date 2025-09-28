const express = require('express');
const router = express.Router();
const InscriptionController = require('../controllers/inscriptionController');
const { authenticateToken } = require('../middleware/auth');
const { requireOrganizadorOrAdmin } = require('../middleware/roleAuth');
const { validateInscriptionPagination, validateEventId } = require('../middleware/validation');

// =============================================
// RUTAS PÚBLICAS
// =============================================

// Verificar estado de inscripción (público, pero requiere autenticación)
router.get('/events/:id/inscription/status', 
  validateEventId,
  authenticateToken, 
  InscriptionController.getInscriptionStatus
);

// =============================================
// RUTAS PROTEGIDAS - USUARIOS AUTENTICADOS
// =============================================

// Inscribirse a un evento
router.post('/events/:id/inscription', 
  validateEventId,
  authenticateToken, 
  InscriptionController.subscribeToEvent
);

// Cancelar inscripción de un evento
router.delete('/events/:id/inscription', 
  validateEventId,
  authenticateToken, 
  InscriptionController.unsubscribeFromEvent
);

// Obtener inscripciones del usuario autenticado
router.get('/my-inscriptions', 
  authenticateToken,
  validateInscriptionPagination,
  InscriptionController.getUserInscriptions
);

// Obtener estadísticas de inscripciones del usuario
router.get('/my-inscriptions/stats', 
  authenticateToken, 
  InscriptionController.getUserStats
);

// =============================================
// RUTAS PROTEGIDAS - SOLO ORGANIZADORES Y ADMINS
// =============================================

// Obtener inscripciones de un evento específico (para organizadores)
router.get('/events/:id/inscriptions', 
  validateEventId,
  authenticateToken, 
  requireOrganizadorOrAdmin,
  validateInscriptionPagination,
  InscriptionController.getEventInscriptions
);

// Obtener estadísticas de inscripciones de un evento (para organizadores)
router.get('/events/:id/inscriptions/stats', 
  validateEventId,
  authenticateToken, 
  requireOrganizadorOrAdmin,
  InscriptionController.getEventStats
);

module.exports = router;
