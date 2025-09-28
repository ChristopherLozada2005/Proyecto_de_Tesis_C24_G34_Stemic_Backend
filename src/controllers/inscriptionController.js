const Inscription = require('../models/Inscription');

class InscriptionController {
  // Inscribir usuario a un evento
  static async subscribeToEvent(req, res) {
    try {
      const { id: eventId } = req.params;
      const userId = req.user.id;

      // Validar que el eventId sea un UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(eventId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de evento inválido'
        });
      }

      const inscription = await Inscription.create(userId, eventId);
      
      res.status(201).json({
        success: true,
        message: 'Te has inscrito exitosamente al evento',
        data: inscription.toJSON()
      });
    } catch (error) {
      console.error('Error en subscribeToEvent:', error);
      
      if (error.message === 'El evento no existe o no está disponible') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message === 'No puedes inscribirte a un evento que ya ha pasado') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message === 'Ya estás inscrito en este evento') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // Cancelar inscripción de un evento
  static async unsubscribeFromEvent(req, res) {
    try {
      const { id: eventId } = req.params;
      const userId = req.user.id;

      // Validar que el eventId sea un UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(eventId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de evento inválido'
        });
      }

      const result = await Inscription.cancel(userId, eventId);
      
      res.status(200).json({
        success: true,
        message: 'Te has desinscrito exitosamente del evento',
        data: {
          inscription_id: result.id,
          fecha_inscripcion: result.fecha_inscripcion
        }
      });
    } catch (error) {
      console.error('Error en unsubscribeFromEvent:', error);
      
      if (error.message === 'No estás inscrito en este evento') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // Verificar estado de inscripción
  static async getInscriptionStatus(req, res) {
    try {
      const { id: eventId } = req.params;
      const userId = req.user.id;

      // Validar que el eventId sea un UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(eventId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de evento inválido'
        });
      }

      const inscription = await Inscription.isUserInscribed(userId, eventId);
      
      res.status(200).json({
        success: true,
        data: {
          is_inscribed: !!inscription,
          inscription: inscription ? {
            id: inscription.id,
            fecha_inscripcion: inscription.fecha_inscripcion
          } : null
        }
      });
    } catch (error) {
      console.error('Error en getInscriptionStatus:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // Obtener inscripciones del usuario autenticado
  static async getUserInscriptions(req, res) {
    try {
      const userId = req.user.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      // Validar parámetros de paginación
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          message: 'Parámetros de paginación inválidos. page >= 1, limit entre 1 y 100'
        });
      }

      const result = await Inscription.getByUserId(userId, page, limit);
      
      res.status(200).json({
        success: true,
        data: result.inscriptions,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error en getUserInscriptions:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // Obtener inscripciones de un evento específico (para organizadores)
  static async getEventInscriptions(req, res) {
    try {
      const { id: eventId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      // Validar que el eventId sea un UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(eventId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de evento inválido'
        });
      }

      // Validar parámetros de paginación
      if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({
          success: false,
          message: 'Parámetros de paginación inválidos. page >= 1, limit entre 1 y 100'
        });
      }

      const result = await Inscription.getByEventId(eventId, page, limit);
      
      res.status(200).json({
        success: true,
        data: result.inscriptions,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error en getEventInscriptions:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // Obtener estadísticas de inscripciones de un evento
  static async getEventStats(req, res) {
    try {
      const { id: eventId } = req.params;

      // Validar que el eventId sea un UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(eventId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de evento inválido'
        });
      }

      const stats = await Inscription.getEventStats(eventId);
      
      res.status(200).json({
        success: true,
        data: {
          total_inscripciones: parseInt(stats.total_inscripciones),
          primera_inscripcion: stats.primera_inscripcion,
          ultima_inscripcion: stats.ultima_inscripcion
        }
      });
    } catch (error) {
      console.error('Error en getEventStats:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // Obtener estadísticas de inscripciones del usuario
  static async getUserStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await Inscription.getUserStats(userId);
      
      res.status(200).json({
        success: true,
        data: {
          total_inscripciones: parseInt(stats.total_inscripciones),
          primera_inscripcion: stats.primera_inscripcion,
          ultima_inscripcion: stats.ultima_inscripcion
        }
      });
    } catch (error) {
      console.error('Error en getUserStats:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }
}

module.exports = InscriptionController;
