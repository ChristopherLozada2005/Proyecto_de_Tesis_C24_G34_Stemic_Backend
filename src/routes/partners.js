const express = require('express');
const router = express.Router();
const PartnerController = require('../controllers/partnerController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleAuth');
const { validatePartner, validatePartnerPagination } = require('../middleware/validation');
const { handlePartnerLogoUpload, cleanupImageOnError } = require('../middleware/cloudinaryUpload');

// =============================================
// RUTAS PÚBLICAS
// =============================================

// Obtener alianzas activas (público)
router.get('/activas', PartnerController.getActivePartners);

// =============================================
// RUTAS PROTEGIDAS - SOLO ADMINS
// =============================================

// Obtener todas las alianzas con filtros
router.get('/', 
  authenticateToken, 
  requireAdmin,
  validatePartnerPagination,
  PartnerController.getAllPartners
);

// Buscar alianzas por nombre
router.get('/buscar', 
  authenticateToken, 
  requireAdmin,
  PartnerController.searchPartners
);

// Obtener estadísticas de alianzas
router.get('/estadisticas', 
  authenticateToken, 
  requireAdmin,
  PartnerController.getPartnerStats
);

// Crear nueva alianza
router.post('/', 
  authenticateToken, 
  requireAdmin,
  handlePartnerLogoUpload,
  cleanupImageOnError,
  validatePartner,
  PartnerController.createPartner
);

// Obtener alianza por ID
router.get('/:id', 
  authenticateToken, 
  requireAdmin,
  PartnerController.getPartnerById
);

// Actualizar alianza
router.patch('/:id', 
  authenticateToken, 
  requireAdmin,
  handlePartnerLogoUpload,
  cleanupImageOnError,
  PartnerController.updatePartner
);

// Desactivar alianza
router.patch('/:id/desactivar', 
  authenticateToken, 
  requireAdmin,
  PartnerController.deactivatePartner
);

// Activar alianza
router.patch('/:id/activar', 
  authenticateToken, 
  requireAdmin,
  PartnerController.activatePartner
);

// Eliminar alianza permanentemente
router.delete('/:id', 
  authenticateToken, 
  requireAdmin,
  PartnerController.deletePartner
);

module.exports = router;
