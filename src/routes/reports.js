const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const { requireOrganizadorOrAdmin } = require('../middleware/roleAuth');
const { validateReportFilters } = require('../middleware/reportValidation');

// ===============================
// RUTAS DE REPORTES (Solo organizadores y admins)
// ===============================

// Obtener datos de participación (vista previa)
router.get('/participation', 
  authenticateToken, 
  requireOrganizadorOrAdmin,
  validateReportFilters,
  ReportController.getParticipationData
);

// Obtener datos de satisfacción (vista previa)
router.get('/satisfaction', 
  authenticateToken, 
  requireOrganizadorOrAdmin,
  validateReportFilters,
  ReportController.getSatisfactionData
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

module.exports = router;
