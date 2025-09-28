const Partner = require('../models/Partner');
const { deleteOldImage } = require('../middleware/cloudinaryUpload');

class PartnerController {
  // Crear nueva alianza (solo admins)
  static async createPartner(req, res) {
    try {
      const { nombre, descripcion, logo_url, sitio_web, activo = true } = req.body;

      const partner = await Partner.create({
        nombre,
        descripcion,
        logo_url,
        sitio_web,
        activo
      });
      
      res.status(201).json({
        success: true,
        message: 'Alianza creada exitosamente',
        data: partner.toJSON()
      });
    } catch (error) {
      console.error('Error en createPartner:', error);
      
      if (error.message === 'Ya existe una alianza con ese nombre') {
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

  // Obtener todas las alianzas activas (público)
  static async getAllPartners(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {};

      // Aplicar filtros (solo activas por defecto para usuarios públicos)
      if (req.query.activo !== undefined) {
        filters.activo = req.query.activo === 'true';
      } else {
        // Por defecto, mostrar solo alianzas activas para usuarios públicos
        filters.activo = true;
      }
      
      if (req.query.nombre) {
        filters.nombre = req.query.nombre;
      }
      if (req.query.descripcion) {
        filters.descripcion = req.query.descripcion;
      }
      if (req.query.fecha_desde) {
        filters.fecha_desde = req.query.fecha_desde;
      }
      if (req.query.fecha_hasta) {
        filters.fecha_hasta = req.query.fecha_hasta;
      }

      // Usar método que filtra por defecto solo activas
      const result = await Partner.findAll(filters, page, limit);
      
      res.status(200).json({
        success: true,
        data: result.partners.map(partner => partner.toJSON()),
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error en getAllPartners:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // Obtener todas las alianzas (incluyendo inactivas) - Solo admins
  static async getAllPartnersForAdmin(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {};

      // Aplicar filtros (admins pueden ver todas)
      if (req.query.activo !== undefined) {
        filters.activo = req.query.activo === 'true';
      }
      if (req.query.nombre) {
        filters.nombre = req.query.nombre;
      }
      if (req.query.descripcion) {
        filters.descripcion = req.query.descripcion;
      }
      if (req.query.fecha_desde) {
        filters.fecha_desde = req.query.fecha_desde;
      }
      if (req.query.fecha_hasta) {
        filters.fecha_hasta = req.query.fecha_hasta;
      }

      // Usar método específico para admins que incluye inactivas
      const result = await Partner.findAllForAdmin(filters, page, limit);
      
      res.status(200).json({
        success: true,
        data: result.partners.map(partner => partner.toJSON()),
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error en getAllPartnersForAdmin:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // Obtener alianzas activas (público)
  static async getActivePartners(req, res) {
    try {
      const partners = await Partner.findActive();
      
      res.status(200).json({
        success: true,
        data: partners.map(partner => partner.toJSON())
      });
    } catch (error) {
      console.error('Error en getActivePartners:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // Obtener alianza por ID (solo admins)
  static async getPartnerById(req, res) {
    try {
      const { id } = req.params;
      const partner = await Partner.findById(id);
      
      if (!partner) {
        return res.status(404).json({
          success: false,
          message: 'Alianza no encontrada'
        });
      }
      
      res.status(200).json({
        success: true,
        data: partner.toJSON()
      });
    } catch (error) {
      console.error('Error en getPartnerById:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // Actualizar alianza (solo admins)
  static async updatePartner(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Si se está actualizando el logo, eliminar el anterior
      if (updateData.logo_url) {
        const existingPartner = await Partner.findById(id);
        if (existingPartner && existingPartner.logo_url) {
          await deleteOldImage(existingPartner.logo_url);
        }
      }

      const partner = await Partner.update(id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Alianza actualizada exitosamente',
        data: partner.toJSON()
      });
    } catch (error) {
      console.error('Error en updatePartner:', error);
      
      if (error.message === 'Alianza no encontrada') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message === 'No hay campos para actualizar') {
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

  // Desactivar alianza (solo admins)
  static async deactivatePartner(req, res) {
    try {
      const { id } = req.params;
      const partner = await Partner.deactivate(id);
      
      res.status(200).json({
        success: true,
        message: 'Alianza desactivada exitosamente',
        data: partner.toJSON()
      });
    } catch (error) {
      console.error('Error en deactivatePartner:', error);
      
      if (error.message === 'Alianza no encontrada') {
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

  // Activar alianza (solo admins)
  static async activatePartner(req, res) {
    try {
      const { id } = req.params;
      const partner = await Partner.activate(id);
      
      res.status(200).json({
        success: true,
        message: 'Alianza activada exitosamente',
        data: partner.toJSON()
      });
    } catch (error) {
      console.error('Error en activatePartner:', error);
      
      if (error.message === 'Alianza no encontrada') {
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

  // Eliminar alianza permanentemente (solo admins)
  static async deletePartner(req, res) {
    try {
      const { id } = req.params;
      const result = await Partner.delete(id);
      
      res.status(200).json({
        success: true,
        message: 'Alianza eliminada permanentemente',
        data: {
          id: result.id,
          nombre: result.nombre
        }
      });
    } catch (error) {
      console.error('Error en deletePartner:', error);
      
      if (error.message === 'Alianza no encontrada') {
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

  // Obtener estadísticas de alianzas (solo admins)
  static async getPartnerStats(req, res) {
    try {
      const stats = await Partner.getStats();
      
      res.status(200).json({
        success: true,
        data: {
          total_alianzas: parseInt(stats.total_alianzas),
          alianzas_activas: parseInt(stats.alianzas_activas),
          alianzas_inactivas: parseInt(stats.alianzas_inactivas),
          primera_alianza: stats.primera_alianza,
          ultima_alianza: stats.ultima_alianza
        }
      });
    } catch (error) {
      console.error('Error en getPartnerStats:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }

  // Buscar alianzas por nombre (solo admins)
  static async searchPartners(req, res) {
    try {
      const { q: searchTerm } = req.query;
      const limit = parseInt(req.query.limit) || 10;

      if (!searchTerm || searchTerm.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: 'El término de búsqueda debe tener al menos 2 caracteres'
        });
      }

      const partners = await Partner.searchByName(searchTerm.trim(), limit);
      
      res.status(200).json({
        success: true,
        data: partners
      });
    } catch (error) {
      console.error('Error en searchPartners:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
      });
    }
  }
}

module.exports = PartnerController;
