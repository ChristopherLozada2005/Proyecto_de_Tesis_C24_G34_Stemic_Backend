const express = require('express');
const router = express.Router();
const AttendanceController = require('../controllers/attendanceController');
const { authenticateToken } = require('../middleware/auth');
const { requireOrganizadorOrAdmin } = require('../middleware/roleAuth');

// =============================================
// RUTAS PÚBLICAS
// =============================================

// Verificar asistencia mediante QR (usuarios autenticados)
router.post('/verify', 
  authenticateToken,
  AttendanceController.verifyAttendance
);

// Verificar si un usuario puede evaluar (asistió al evento)
router.get('/can-evaluate/:evento_id',
  authenticateToken,
  AttendanceController.canUserEvaluate
);

// Obtener verificaciones de un usuario
router.get('/user/verifications',
  authenticateToken,
  AttendanceController.getUserVerifications
);

// =============================================
// RUTAS PROTEGIDAS - ORGANIZADORES Y ADMINS
// =============================================

// Generar QR de asistencia para un evento
router.post('/generate-qr',
  authenticateToken,
  requireOrganizadorOrAdmin,
  AttendanceController.generateQR
);

// Obtener QR activo de un evento
router.get('/event/:evento_id/qr',
  authenticateToken,
  requireOrganizadorOrAdmin,
  AttendanceController.getActiveQR
);

// Obtener historial de QR de un evento
router.get('/event/:evento_id/qr-history',
  authenticateToken,
  requireOrganizadorOrAdmin,
  AttendanceController.getEventQRHistory
);

// Obtener verificaciones de asistencia de un evento
router.get('/event/:evento_id/verifications',
  authenticateToken,
  requireOrganizadorOrAdmin,
  AttendanceController.getEventVerifications
);

// Obtener estadísticas de asistencia de un evento
router.get('/event/:evento_id/stats',
  authenticateToken,
  requireOrganizadorOrAdmin,
  AttendanceController.getEventStats
);

// Desactivar QR de un evento
router.delete('/event/:evento_id/qr',
  authenticateToken,
  requireOrganizadorOrAdmin,
  AttendanceController.deactivateQR
);

module.exports = router;
