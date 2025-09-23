const express = require('express');
const router = express.Router();
const EventController = require('../controllers/eventController');
const { authenticateToken } = require('../middleware/auth');
const { 
  validateEvent, 
  validateEventUpdate, 
  validateEventFilters 
} = require('../middleware/validation');
const { 
  handleUploadErrors, 
  cleanupOnError, 
  validateImageExists 
} = require('../middleware/upload');

// Aplicar middleware de autenticación a todas las rutas que lo requieren
// Las rutas públicas están al principio sin autenticación

// ===============================
// RUTAS PÚBLICAS (sin autenticación)
// ===============================

// Obtener todos los eventos (público) - con filtros
router.get('/public', validateEventFilters, EventController.getAllEvents);

// Obtener evento específico por ID (público)
router.get('/public/:id', EventController.getEventById);

// Buscar eventos (público)
router.get('/public/search', EventController.searchEvents);

// Obtener próximos eventos (público)
router.get('/public/upcoming', EventController.getUpcomingEvents);

// Obtener opciones para formularios (skills, tags, modalidades)
router.get('/options', EventController.getEventOptions);

// Obtener estadísticas generales (público)
router.get('/public/stats', EventController.getEventStats);

// ===============================
// RUTAS PROTEGIDAS (requieren autenticación)
// ===============================

// Aplicar autenticación a todas las rutas siguientes
router.use(authenticateToken);

// ===============================
// CRUD BÁSICO
// ===============================

// Crear nuevo evento
router.post('/', 
  handleUploadErrors,           // Manejo de subida de imagen
  cleanupOnError,              // Limpieza en caso de error
  validateEvent,               // Validación de datos
  EventController.createEvent
);

// Obtener todos los eventos (autenticado) - con filtros
router.get('/', validateEventFilters, EventController.getAllEvents);

// Obtener evento específico por ID
router.get('/:id', EventController.getEventById);

// Actualizar evento
router.put('/:id', 
  handleUploadErrors,           // Manejo de subida de imagen
  cleanupOnError,              // Limpieza en caso de error
  validateImageExists,         // Validar imagen existente si no se sube nueva
  validateEventUpdate,         // Validación de datos de actualización
  EventController.updateEvent
);

// Eliminar evento (soft delete)
router.delete('/:id', EventController.deleteEvent);

// ===============================
// RUTAS ESPECÍFICAS DEL USUARIO
// ===============================

// Obtener eventos del usuario autenticado
router.get('/user/my-events', EventController.getMyEvents);

// Obtener estadísticas del usuario
router.get('/user/stats', EventController.getEventStats);

// ===============================
// RUTAS DE BÚSQUEDA Y FILTROS
// ===============================

// Buscar eventos (autenticado - puede tener más resultados)
router.get('/search', EventController.searchEvents);

// Obtener próximos eventos (autenticado)
router.get('/upcoming', EventController.getUpcomingEvents);

// ===============================
// RUTAS ADMINISTRATIVAS (si es necesario en el futuro)
// ===============================

// Estas rutas podrían requerir permisos adicionales de administrador
// Por ahora están comentadas, pero la estructura está lista

/*
// Middleware para verificar permisos de administrador
const requireAdmin = (req, res, next) => {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Permisos de administrador requeridos'
    });
  }
  next();
};

// Obtener todos los eventos incluyendo inactivos (solo admin)
router.get('/admin/all', requireAdmin, EventController.getAllEventsAdmin);

// Restaurar evento eliminado (solo admin)
router.patch('/admin/:id/restore', requireAdmin, EventController.restoreEvent);

// Eliminar evento permanentemente (solo admin)
router.delete('/admin/:id/permanent', requireAdmin, EventController.permanentDelete);
*/

// ===============================
// MANEJO DE ERRORES
// ===============================

// Middleware para manejar rutas no encontradas en este router
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta de eventos no encontrada'
  });
});

// Middleware de manejo de errores específico para eventos
router.use((error, req, res, next) => {
  console.error('Error en rutas de eventos:', error);
  
  // Si hay un archivo subido en caso de error, intentar eliminarlo
  if (req.uploadedFile) {
    const { deleteFile } = require('../middleware/upload');
    deleteFile(req.uploadedFile.filename).catch(deleteError => {
      console.error('Error al eliminar archivo tras error:', deleteError);
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor en la gestión de eventos'
  });
});

module.exports = router;
