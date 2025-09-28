const Postulation = require('../models/Postulation');

class PostulationController {
  // Crear nueva postulación
  static async createPostulation(req, res) {
    try {
      const userId = req.user.id;
      const { carrera_especialidad, motivacion } = req.body;

      const postulation = await Postulation.create(userId, {
        carrera_especialidad,
        motivacion
      });
      
      res.status(201).json({
        success: true,
        message: 'Postulación enviada exitosamente. Te notificaremos sobre el resultado.',
        data: postulation.toJSON()
      });
    } catch (error) {
      console.error('Error en createPostulation:', error);
      
      if (error.message === 'Ya has postulado anteriormente a LEAD at TECSUP') {
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

  // Obtener mi postulación
  static async getMyPostulation(req, res) {
    try {
      const userId = req.user.id;
      const postulation = await Postulation.findByUserId(userId);
      
      if (!postulation) {
        return res.status(404).json({
          success: false,
          message: 'No tienes ninguna postulación pendiente'
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          id: postulation.id,
          carrera_especialidad: postulation.carrera_especialidad,
          motivacion: postulation.motivacion,
          estado: postulation.estado,
          fecha_postulacion: postulation.fecha_postulacion,
          fecha_revision: postulation.fecha_revision,
          comentarios_revision: postulation.comentarios_revision,
          revisor: postulation.revisado_por ? {
            nombre: postulation.revisor_nombre,
            correo: postulation.revisor_correo
          } : null
        }
      });
    } catch (error) {
      console.error('Error en getMyPostulation:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // Obtener todas las postulaciones (solo admins)
  static async getAllPostulations(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {};

      // Aplicar filtros
      if (req.query.estado) {
        filters.estado = req.query.estado;
      }
      if (req.query.carrera_especialidad) {
        filters.carrera_especialidad = req.query.carrera_especialidad;
      }
      if (req.query.fecha_desde) {
        filters.fecha_desde = req.query.fecha_desde;
      }
      if (req.query.fecha_hasta) {
        filters.fecha_hasta = req.query.fecha_hasta;
      }

      const result = await Postulation.findAll(filters, page, limit);
      
      res.status(200).json({
        success: true,
        data: result.postulations,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error en getAllPostulations:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // Obtener postulación por ID (solo admins)
  static async getPostulationById(req, res) {
    try {
      const { id } = req.params;
      const postulation = await Postulation.findById(id);
      
      if (!postulation) {
        return res.status(404).json({
          success: false,
          message: 'Postulación no encontrada'
        });
      }
      
      res.status(200).json({
        success: true,
        data: {
          id: postulation.id,
          carrera_especialidad: postulation.carrera_especialidad,
          motivacion: postulation.motivacion,
          estado: postulation.estado,
          fecha_postulacion: postulation.fecha_postulacion,
          fecha_revision: postulation.fecha_revision,
          comentarios_revision: postulation.comentarios_revision,
          usuario: {
            id: postulation.user_id,
            nombre: postulation.usuario_nombre,
            correo: postulation.usuario_correo
          },
          revisor: postulation.revisado_por ? {
            id: postulation.revisado_por,
            nombre: postulation.revisor_nombre,
            correo: postulation.revisor_correo
          } : null
        }
      });
    } catch (error) {
      console.error('Error en getPostulationById:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // Aprobar postulación (solo admins)
  static async approvePostulation(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const { comentarios } = req.body;

      const postulation = await Postulation.updateStatus(id, adminId, 'aprobada', comentarios);
      
      // Obtener información actualizada del usuario
      const userInfo = await Postulation.getUserRoleAfterApproval(id);
      
      res.status(200).json({
        success: true,
        message: 'Postulación aprobada exitosamente. El usuario ahora tiene rol de organizador.',
        data: {
          ...postulation.toJSON(),
          role_updated: true,
          new_role: 'organizador',
          user_info: userInfo ? {
            id: userInfo.id,
            nombre: userInfo.nombre,
            correo: userInfo.correo,
            rol: userInfo.rol
          } : null
        }
      });
    } catch (error) {
      console.error('Error en approvePostulation:', error);
      
      if (error.message === 'Postulación no encontrada') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message === 'Estado inválido') {
        return res.status(400).json({
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

  // Rechazar postulación (solo admins)
  static async rejectPostulation(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const { comentarios } = req.body;

      const postulation = await Postulation.updateStatus(id, adminId, 'rechazada', comentarios);
      
      res.status(200).json({
        success: true,
        message: 'Postulación rechazada exitosamente',
        data: postulation.toJSON()
      });
    } catch (error) {
      console.error('Error en rejectPostulation:', error);
      
      if (error.message === 'Postulación no encontrada') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message === 'Estado inválido') {
        return res.status(400).json({
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

  // Cambiar estado de postulación (solo admins)
  static async updatePostulationStatus(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const { estado, comentarios } = req.body;

      const postulation = await Postulation.updateStatus(id, adminId, estado, comentarios);
      
      res.status(200).json({
        success: true,
        message: `Estado de postulación actualizado a: ${estado}`,
        data: postulation.toJSON()
      });
    } catch (error) {
      console.error('Error en updatePostulationStatus:', error);
      
      if (error.message === 'Postulación no encontrada') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message === 'Estado inválido') {
        return res.status(400).json({
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

  // Eliminar postulación (solo si está pendiente y es propia)
  static async deletePostulation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await Postulation.delete(id, userId);
      
      res.status(200).json({
        success: true,
        message: 'Postulación eliminada exitosamente',
        data: { id: result.id }
      });
    } catch (error) {
      console.error('Error en deletePostulation:', error);
      
      if (error.message.includes('No se puede eliminar')) {
        return res.status(400).json({
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

  // Obtener estadísticas de postulaciones (solo admins)
  static async getPostulationStats(req, res) {
    try {
      const stats = await Postulation.getStats();
      const statsByCareer = await Postulation.getStatsByCareer();
      
      res.status(200).json({
        success: true,
        data: {
          general: {
            total_postulaciones: parseInt(stats.total_postulaciones),
            pendientes: parseInt(stats.pendientes),
            aprobadas: parseInt(stats.aprobadas),
            rechazadas: parseInt(stats.rechazadas),
            primera_postulacion: stats.primera_postulacion,
            ultima_postulacion: stats.ultima_postulacion
          },
          por_carrera: statsByCareer.map(career => ({
            carrera_especialidad: career.carrera_especialidad,
            total: parseInt(career.total),
            pendientes: parseInt(career.pendientes),
            aprobadas: parseInt(career.aprobadas),
            rechazadas: parseInt(career.rechazadas)
          }))
        }
      });
    } catch (error) {
      console.error('Error en getPostulationStats:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }
}

module.exports = PostulationController;
