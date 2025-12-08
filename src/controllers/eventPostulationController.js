const Event = require('../models/Event');
const EventPostulation = require('../models/EventPostulation');
const Inscription = require('../models/Inscription');

class EventPostulationController {
  static async getForm(req, res) {
    try {
      const { eventId } = req.params;
      const form = await Event.getPostulationForm(eventId);

      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        });
      }

      res.json({
        success: true,
        data: form
      });
    } catch (error) {
      console.error('Error al obtener formulario de postulación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  static async saveForm(req, res) {
    try {
      const { eventId } = req.params;
      const { schema, allowCustomForm = true } = req.body;

      if (allowCustomForm && (!schema || typeof schema !== 'object')) {
        return res.status(400).json({
          success: false,
          message: 'El esquema del formulario es requerido cuando el formulario personalizado está habilitado'
        });
      }

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        });
      }

      const isAdmin = req.user.rol === 'admin';
      const isOwner = event.created_by === req.user.id;
      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Solo el creador del evento o un administrador puede actualizar el formulario'
        });
      }

      const saved = await Event.savePostulationForm(eventId, {
        schema: allowCustomForm ? schema : null,
        allowCustomForm
      });

      res.json({
        success: true,
        message: 'Formulario actualizado correctamente',
        data: saved
      });
    } catch (error) {
      console.error('Error al guardar formulario de postulación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  static async submit(req, res) {
    try {
      const { eventId } = req.params;
      const { responses } = req.body;

      if (!responses || typeof responses !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Las respuestas del formulario son requeridas'
        });
      }

      const eventForm = await Event.getPostulationForm(eventId);
      if (!eventForm) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        });
      }

      if (!eventForm.allow_custom_form || !eventForm.postulation_schema) {
        return res.status(400).json({
          success: false,
          message: 'Este evento no tiene un formulario personalizado habilitado'
        });
      }

      const submission = await EventPostulation.upsertForUser({
        eventId,
        userId: req.user.id,
        schemaSnapshot: eventForm.postulation_schema,
        responses
      });

      res.status(201).json({
        success: true,
        message: 'Tu postulación fue registrada correctamente',
        data: submission.toJSON()
      });
    } catch (error) {
      console.error('Error al enviar postulación de evento:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  static async getMyPostulation(req, res) {
    try {
      const { eventId } = req.params;
      const submission = await EventPostulation.getUserPostulationForEvent(eventId, req.user.id);

      if (!submission) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró una postulación para este evento'
        });
      }

      res.json({
        success: true,
        data: submission.toJSON()
      });
    } catch (error) {
      console.error('Error al obtener mi postulación de evento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  static async list(req, res) {
    try {
      const { eventId } = req.params;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const filters = {};

      if (req.query.estado) {
        filters.estado = req.query.estado;
      }

      if (req.query.search) {
        filters.search = req.query.search;
      }

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        });
      }

      const isAdmin = req.user.rol === 'admin';
      const isOrganizer = req.user.rol === 'organizador';
      const isOwner = event.created_by === req.user.id;
      if (!isAdmin && !isOrganizer && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Solo un administrador, organizador o el creador del evento puede ver las postulaciones'
        });
      }

      const data = await EventPostulation.findByEvent(eventId, filters, page, limit);
      const stats = await EventPostulation.getStats(eventId);

      res.json({
        success: true,
        data: data.postulations,
        pagination: data.pagination,
        stats
      });
    } catch (error) {
      console.error('Error al listar postulaciones del evento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  static async updateStatus(req, res) {
    try {
      const { eventId, postulationId } = req.params;
      const { estado, comentarios } = req.body;

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        });
      }

      const isAdmin = req.user.rol === 'admin';
      const isOrganizer = req.user.rol === 'organizador';
      const isOwner = event.created_by === req.user.id;
      if (!isAdmin && !isOrganizer && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Solo un administrador, organizador o el creador del evento puede actualizar postulaciones'
        });
      }
      
      const updated = await EventPostulation.updateStatus(postulationId, req.user.id, estado, comentarios);

      if (estado === 'aprobado') {
        try {
          const existingInscription = await Inscription.isUserInscribed(updated.user_id, updated.event_id);
          
          if (!existingInscription) {
            await Inscription.create(updated.user_id, updated.event_id);
            console.log(`Usuario ${updated.user_id} inscrito automáticamente al evento ${updated.event_id} tras aprobación.`);
          }
        } catch (inscError) {
          console.error('Error al inscribir usuario automáticamente:', inscError);
        }
      }

      res.json({
        success: true,
        message: 'Estado actualizado correctamente',
        data: updated.toJSON()
      });
    } catch (error) {
      console.error('Error al actualizar postulación de evento:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }
}

module.exports = EventPostulationController;
