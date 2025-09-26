const express = require('express');
const router = express.Router();
const EventController = require('../controllers/eventController');
const { authenticateToken } = require('../middleware/auth');
const { requireOrganizadorOrAdmin } = require('../middleware/roleAuth');
const { 
  validateEvent, 
  validateEventUpdate, 
  validateEventFilters 
} = require('../middleware/validation');
const { 
  handleEventImageUpload, 
  cleanupImageOnError 
} = require('../middleware/cloudinaryUpload');

// ===============================
// RUTAS PÚBLICAS (sin autenticación)
// ===============================

// Obtener todos los eventos con filtros (público) - ruta principal
router.get('/', validateEventFilters, EventController.getAllEvents);

// Obtener todos los eventos con filtros (público) - ruta alternativa para compatibilidad frontend
router.get('/public', validateEventFilters, EventController.getAllEvents);

// Obtener evento específico por ID (público)
router.get('/:id', EventController.getEventById);

// Obtener evento específico por ID (público) - ruta alternativa para compatibilidad frontend
router.get('/public/:id', EventController.getEventById);

// Buscar eventos (público)
router.get('/search', EventController.searchEvents);

// Buscar eventos (público) - ruta alternativa para compatibilidad frontend
router.get('/public/search', EventController.searchEvents);

// Obtener próximos eventos (público)
router.get('/upcoming', EventController.getUpcomingEvents);

// Obtener próximos eventos (público) - ruta alternativa para compatibilidad frontend
router.get('/public/upcoming', EventController.getUpcomingEvents);

// Obtener opciones para formularios (skills, tags, modalidades)
router.get('/options', EventController.getEventOptions);

// Obtener estadísticas generales (público)
router.get('/stats', EventController.getEventStats);

// Obtener estadísticas generales (público) - ruta alternativa para compatibilidad frontend
router.get('/public/stats', EventController.getEventStats);

// ===============================
// RUTAS PROTEGIDAS (requieren autenticación + roles)
// ===============================

// Crear nuevo evento (solo organizador/admin)
router.post('/', 
  authenticateToken,                // Verificar autenticación
  requireOrganizadorOrAdmin,        // Verificar rol organizador/admin
  handleEventImageUpload,           // Cloudinary upload
  cleanupImageOnError,              // Limpieza en caso de error
  validateEvent,                    // Validación de datos
  EventController.createEvent
);

// Actualizar evento (solo organizador/admin)
router.put('/:id', 
  authenticateToken,                // Verificar autenticación
  requireOrganizadorOrAdmin,        // Verificar rol organizador/admin
  handleEventImageUpload,           // Cloudinary upload (opcional)
  cleanupImageOnError,              // Limpieza en caso de error
  validateEventUpdate,              // Validación de datos de actualización
  EventController.updateEvent
);

// Eliminar evento (solo organizador/admin)
router.delete('/:id', 
  authenticateToken,                // Verificar autenticación
  requireOrganizadorOrAdmin,        // Verificar rol organizador/admin
  EventController.deleteEvent
);

// ===============================
// RUTAS DE USUARIO AUTENTICADO
// ===============================

// Obtener eventos del usuario autenticado
router.get('/user/my-events', 
  authenticateToken, 
  EventController.getMyEvents
);

// Obtener estadísticas del usuario
router.get('/user/stats', 
  authenticateToken, 
  EventController.getEventStats
);

module.exports = router;