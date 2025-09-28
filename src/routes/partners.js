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

// Obtener alianzas activas (público) - Alias para compatibilidad
router.get('/activas', PartnerController.getActivePartners);

// Obtener todas las alianzas activas (público) - Endpoint principal
router.get('/', 
  validatePartnerPagination,
  PartnerController.getAllPartners
);

// =============================================
// RUTAS PROTEGIDAS - SOLO ADMINS
// =============================================

// Obtener todas las alianzas con filtros (incluyendo inactivas) - Solo admins
router.get('/admin', 
  authenticateToken, 
  requireAdmin,
  validatePartnerPagination,
  PartnerController.getAllPartnersForAdmin
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
