const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const { requireOrganizadorOrAdmin, requireAdmin } = require('../middleware/roleAuth');
const { validateReportFilters } = require('../middleware/reportValidation');

// ===============================
// RUTAS DE REPORTES (Solo organizadores y admins)
// ===============================

// Obtener datos de participación (vista previa)
router.get('/participation', 
  authenticateToken, 
  requireOrganizadorOrAdmin,
  validateReportFilters,
  ReportController.getParticipationDataPreview
);

// Obtener datos de satisfacción (vista previa)
router.get('/satisfaction', 
  authenticateToken, 
  requireOrganizadorOrAdmin,
  validateReportFilters,
  ReportController.getSatisfactionDataPreview
);

// Exportar reporte de participación en Excel
router.get('/participation/excel', 
  authenticateToken, 
  requireOrganizadorOrAdmin,
  validateReportFilters,
  ReportController.exportParticipationExcel
);

// Exportar reporte de participación en PDF
router.get('/participation/pdf', 
  authenticateToken, 
  requireOrganizadorOrAdmin,
  validateReportFilters,
  ReportController.exportParticipationPDF
);

// Exportar reporte de satisfacción en Excel
router.get('/satisfaction/excel', 
  authenticateToken, 
  requireOrganizadorOrAdmin,
  validateReportFilters,
  ReportController.exportSatisfactionExcel
);

// Exportar reporte de satisfacción en PDF
router.get('/satisfaction/pdf', 
  authenticateToken, 
  requireOrganizadorOrAdmin,
  validateReportFilters,
  ReportController.exportSatisfactionPDF
);

// ===============================
// GESTIÓN DE HISTORIAL DE REPORTES
// ===============================

// Obtener historial de reportes del usuario
router.get('/history', 
  authenticateToken, 
  requireOrganizadorOrAdmin,
  ReportController.getReportHistory
);

// Obtener estadísticas de reportes del usuario
router.get('/stats', 
  authenticateToken, 
  requireOrganizadorOrAdmin,
  ReportController.getReportStats
);

// Obtener todos los reportes (solo para admins)
router.get('/admin/all', 
  authenticateToken, 
  requireAdmin,
  ReportController.getAllReports
);

// Obtener estadísticas generales de reportes (solo para admins)
router.get('/admin/stats', 
  authenticateToken, 
  requireAdmin,
  ReportController.getGeneralReportStats
);

// ===============================
// GESTIÓN DE CACHE DE REPORTES
// ===============================

// Obtener estadísticas del cache
router.get('/cache/stats', 
  authenticateToken, 
  requireOrganizadorOrAdmin,
  ReportController.getCacheStats
);

// Obtener datos del cache con filtros
router.get('/cache/data', 
  authenticateToken, 
  requireOrganizadorOrAdmin,
  ReportController.getCacheData
);

// Forzar actualización de datos de un evento
router.post('/cache/update/:evento_id', 
  authenticateToken, 
  requireOrganizadorOrAdmin,
  ReportController.forceUpdateEventData
);

// Limpiar datos obsoletos del cache (solo para admins)
router.post('/cache/clean', 
  authenticateToken, 
  requireAdmin,
  ReportController.cleanStaleData
);

module.exports = router;
