const Event = require('../models/Event');
const { deleteFile } = require('../middleware/upload');

class EventController {
  // Crear nuevo evento
  static async createEvent(req, res) {
    try {
      const eventData = {
        ...req.body,
        created_by: req.user.id
      };

      // Si se subió una imagen, la URL ya está en req.body.imagen_url gracias al middleware
      const newEvent = await Event.create(eventData);

      res.status(201).json({
        success: true,
        message: 'Evento creado exitosamente',
        data: newEvent.toJSON()
      });

    } catch (error) {
      console.error('Error en createEvent:', error);
      
      // Si hay error y se subió una imagen, eliminarla
      if (req.uploadedFile) {
        try {
          await deleteFile(req.uploadedFile.filename);
        } catch (deleteError) {
          console.error('Error al eliminar archivo tras fallo:', deleteError);
        }
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  // Obtener todos los eventos con filtros
  static async getAllEvents(req, res) {
    try {
      const {
        modalidad,
        skills,
        tags,
        fecha_desde,
        fecha_hasta,
        requiere_postulacion,
        search,
        page = 1,
        limit = 10
      } = req.query;

      // Preparar filtros
      const filters = {};
      
      if (modalidad) filters.modalidad = modalidad;
      if (fecha_desde) filters.fecha_desde = fecha_desde;
      if (fecha_hasta) filters.fecha_hasta = fecha_hasta;
      if (search) filters.search = search;
      if (requiere_postulacion !== undefined) {
        filters.requiere_postulacion = requiere_postulacion === 'true';
      }

      // Convertir skills y tags de string a array si es necesario
      if (skills) {
        filters.skills = typeof skills === 'string' ? skills.split(',').map(s => s.trim()) : skills;
      }
      if (tags) {
        filters.tags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags;
      }

      // Paginación
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      filters.limit = limitNum;
      filters.offset = (pageNum - 1) * limitNum;

      const events = await Event.findAll(filters);

      // Obtener estadísticas para metadatos
      const stats = await Event.getStats();

      res.json({
        success: true,
        data: events.map(event => event.toPublicJSON()),
        meta: {
          page: pageNum,
          limit: limitNum,
          total_shown: events.length,
          has_more: events.length === limitNum,
          stats: stats
        }
      });

    } catch (error) {
      console.error('Error en getAllEvents:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener evento por ID
  static async getEventById(req, res) {
    try {
      const { id } = req.params;
      
      // Validar formato UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de evento inválido'
        });
      }

      const event = await Event.findById(id);
      
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        });
      }

      // Si el usuario es el creador, mostrar todos los datos, sino solo los públicos
      const eventData = req.user && event.canEdit(req.user.id) 
        ? event.toJSON() 
        : event.toPublicJSON();

      res.json({
        success: true,
        data: eventData
      });

    } catch (error) {
      console.error('Error en getEventById:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener eventos del usuario autenticado
  static async getMyEvents(req, res) {
    try {
      const { includeInactive = false } = req.query;
      
      const filters = {
        includeInactive: includeInactive === 'true'
      };

      const events = await Event.findByCreator(req.user.id, filters);
      const stats = await Event.getStats(req.user.id);

      res.json({
        success: true,
        data: events.map(event => event.toJSON()),
        meta: {
          total: events.length,
          stats: stats
        }
      });

    } catch (error) {
      console.error('Error en getMyEvents:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar evento
  static async updateEvent(req, res) {
    try {
      const { id } = req.params;
      
      // Validar formato UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de evento inválido'
        });
      }

      // Verificar que el evento existe y el usuario tiene permisos
      const existingEvent = await Event.findById(id);
      if (!existingEvent) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        });
      }

      if (!existingEvent.canEdit(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para actualizar este evento'
        });
      }

      // Guardar la imagen anterior para posible eliminación
      const oldImageUrl = existingEvent.imagen_url;
      
      // Actualizar evento
      const updatedEvent = await Event.update(id, req.body, req.user.id);

      // Si se cambió la imagen, eliminar la anterior
      if (oldImageUrl && req.body.imagen_url && oldImageUrl !== req.body.imagen_url) {
        try {
          const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
          const expectedPrefix = `${baseUrl}/uploads/events/`;
          
          if (oldImageUrl.startsWith(expectedPrefix)) {
            const oldFilename = oldImageUrl.replace(expectedPrefix, '');
            await deleteFile(oldFilename);
          }
        } catch (deleteError) {
          console.error('Error al eliminar imagen anterior:', deleteError);
          // No fallar la actualización por esto
        }
      }

      res.json({
        success: true,
        message: 'Evento actualizado exitosamente',
        data: updatedEvent.toJSON()
      });

    } catch (error) {
      console.error('Error en updateEvent:', error);
      
      // Si hay error y se subió una nueva imagen, eliminarla
      if (req.uploadedFile) {
        try {
          await deleteFile(req.uploadedFile.filename);
        } catch (deleteError) {
          console.error('Error al eliminar archivo tras fallo:', deleteError);
        }
      }

      if (error.message.includes('No tienes permisos')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  // Eliminar evento (soft delete)
  static async deleteEvent(req, res) {
    try {
      const { id } = req.params;
      
      // Validar formato UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID de evento inválido'
        });
      }

      // Obtener el evento para verificar permisos y obtener la imagen
      const existingEvent = await Event.findById(id);
      if (!existingEvent) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        });
      }

      if (!existingEvent.canEdit(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para eliminar este evento'
        });
      }

      // Guardar URL de imagen para eliminar después
      const imageUrl = existingEvent.imagen_url;

      // Eliminar evento (soft delete)
      const result = await Event.delete(id, req.user.id);

      // Eliminar imagen asociada
      if (imageUrl) {
        try {
          const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
          const expectedPrefix = `${baseUrl}/uploads/events/`;
          
          if (imageUrl.startsWith(expectedPrefix)) {
            const filename = imageUrl.replace(expectedPrefix, '');
            await deleteFile(filename);
          }
        } catch (deleteError) {
          console.error('Error al eliminar imagen del evento:', deleteError);
          // No fallar la eliminación por esto
        }
      }

      res.json({
        success: true,
        message: 'Evento eliminado exitosamente',
        data: result
      });

    } catch (error) {
      console.error('Error en deleteEvent:', error);
      
      if (error.message.includes('No tienes permisos')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Error interno del servidor'
      });
    }
  }

  // Obtener estadísticas generales de eventos
  static async getEventStats(req, res) {
    try {
      const { user_only = false } = req.query;
      
      const userId = user_only === 'true' ? req.user.id : null;
      const stats = await Event.getStats(userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error en getEventStats:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener próximos eventos
  static async getUpcomingEvents(req, res) {
    try {
      const { limit = 5 } = req.query;
      
      const events = await Event.getUpcomingEvents(parseInt(limit));

      res.json({
        success: true,
        data: events.map(event => event.toPublicJSON()),
        meta: {
          total: events.length,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error en getUpcomingEvents:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener opciones para formularios (skills, tags, modalidades)
  static async getEventOptions(req, res) {
    try {
      const options = {
      skills: [
        { value: 'Liderazgo', label: 'Liderazgo' },
        { value: 'Pensamiento Critico', label: 'Pensamiento Critico' },
        { value: 'Colaboracion', label: 'Colaboracion' },
        { value: 'Conocimiento Tecnico', label: 'Conocimiento Tecnico' },
        { value: 'Comunicacion', label: 'Comunicacion' }
      ],
        tags: [
          { value: 'IA', label: 'IA' },
          { value: 'TECH', label: 'TECH' },
          { value: 'NETWORKING', label: 'NETWORKING' }
        ],
        modalidades: [
          { value: 'virtual', label: 'Virtual' },
          { value: 'presencial', label: 'Presencial' },
          { value: 'hibrido', label: 'Híbrido' }
        ],
        // Para compatibilidad con implementaciones simples
        skills_simple: ['Liderazgo', 'Pensamiento Critico', 'Colaboracion', 'Conocimiento Tecnico', 'Comunicacion'],
        tags_simple: ['IA', 'TECH', 'NETWORKING'],
        modalidades_simple: ['virtual', 'presencial', 'hibrido']
      };

      res.json({
        success: true,
        data: options
      });

    } catch (error) {
      console.error('Error en getEventOptions:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Buscar eventos por término
  static async searchEvents(req, res) {
    try {
      const { q: search, limit = 10 } = req.query;
      
      if (!search || search.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'El término de búsqueda debe tener al menos 2 caracteres'
        });
      }

      const filters = {
        search: search.trim(),
        limit: parseInt(limit)
      };

      const events = await Event.findAll(filters);

      res.json({
        success: true,
        data: events.map(event => event.toPublicJSON()),
        meta: {
          search_term: search.trim(),
          total: events.length,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error en searchEvents:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = EventController;
