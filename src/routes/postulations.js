const express = require('express');
const router = express.Router();
const PostulationController = require('../controllers/postulationController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleAuth');
const { validatePostulation, validatePostulationPagination, validatePostulationStatus } = require('../middleware/validation');

// =============================================
// RUTAS PÚBLICAS - USUARIOS AUTENTICADOS
// =============================================

// Crear nueva postulación
router.post('/', 
  authenticateToken, 
  validatePostulation,
  PostulationController.createPostulation
);

// Obtener mi postulación
router.get('/my-postulation', 
  authenticateToken, 
  PostulationController.getMyPostulation
);

// Eliminar mi postulación (solo si está pendiente)
router.delete('/my-postulation/:id', 
  authenticateToken, 
  PostulationController.deletePostulation
);

// =============================================
// RUTAS PROTEGIDAS - SOLO ADMINS
// =============================================

// Obtener todas las postulaciones
router.get('/', 
  authenticateToken, 
  requireAdmin,
  validatePostulationPagination,
  PostulationController.getAllPostulations
);

// Obtener postulación por ID
router.get('/:id', 
  authenticateToken, 
  requireAdmin,
  PostulationController.getPostulationById
);

// Aprobar postulación
router.patch('/:id/approve', 
  authenticateToken, 
  requireAdmin,
  PostulationController.approvePostulation
);

// Rechazar postulación
router.patch('/:id/reject', 
  authenticateToken, 
  requireAdmin,
  PostulationController.rejectPostulation
);

// Cambiar estado de postulación
router.patch('/:id/status', 
  authenticateToken, 
  requireAdmin,
  validatePostulationStatus,
  PostulationController.updatePostulationStatus
);

// Obtener estadísticas de postulaciones
router.get('/stats/overview', 
  authenticateToken, 
  requireAdmin,
  PostulationController.getPostulationStats
);

module.exports = router;
