const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');
const { requireOrganizadorOrAdmin } = require('../middleware/roleAuth');

// RUTAS DE DASHBOARD GENERAL
// Obtener métricas generales del sistema (organizadores y admins)
router.get('/system/metrics', authenticateToken, requireOrganizadorOrAdmin, DashboardController.getSystemMetrics);

// Obtener métricas por período específico (organizadores y admins)
router.get('/system/metrics/period', authenticateToken, requireOrganizadorOrAdmin, DashboardController.getSystemMetricsByPeriod);

// Obtener métricas de un evento específico (organizadores y admins)
router.get('/events/:eventId/metrics', authenticateToken, requireOrganizadorOrAdmin, DashboardController.getEventMetrics);

module.exports = router;
