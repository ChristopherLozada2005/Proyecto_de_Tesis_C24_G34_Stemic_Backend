const { query } = require('../config/database');

class Inscription {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.event_id = data.event_id;
    this.fecha_inscripcion = data.fecha_inscripcion;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      event_id: this.event_id,
      fecha_inscripcion: this.fecha_inscripcion,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Crear nueva inscripción
  static async create(userId, eventId) {
    try {
      // Verificar que el evento existe y está activo
      const eventQuery = `
        SELECT id, titulo, activo, fecha_hora 
        FROM eventos 
        WHERE id = $1 AND activo = true
      `;
      const eventResult = await query(eventQuery, [eventId]);
      
      if (eventResult.rows.length === 0) {
        throw new Error('El evento no existe o no está disponible');
      }

      const event = eventResult.rows[0];
      
      // Verificar que el evento no haya pasado
      const now = new Date();
      const eventDate = new Date(event.fecha_hora);
      if (eventDate < now) {
        throw new Error('No puedes inscribirte a un evento que ya ha pasado');
      }

      // Crear la inscripción
      const insertQuery = `
        INSERT INTO inscriptions (user_id, event_id, fecha_inscripcion)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        RETURNING *
      `;
      
      const result = await query(insertQuery, [userId, eventId]);
      return new Inscription(result.rows[0]);
      
    } catch (error) {
      if (error.code === '23505') { // Violación de restricción única
        throw new Error('Ya estás inscrito en este evento');
      }
      throw error;
    }
  }

  // Verificar si un usuario está inscrito en un evento
  static async isUserInscribed(userId, eventId) {
    try {
      const queryText = `
        SELECT id, fecha_inscripcion 
        FROM inscriptions 
        WHERE user_id = $1 AND event_id = $2
      `;
      const result = await query(queryText, [userId, eventId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  // Cancelar inscripción (eliminar)
  static async cancel(userId, eventId) {
    try {
      const queryText = `
        DELETE FROM inscriptions 
        WHERE user_id = $1 AND event_id = $2
        RETURNING id, fecha_inscripcion
      `;
      const result = await query(queryText, [userId, eventId]);
      
      if (result.rows.length === 0) {
        throw new Error('No estás inscrito en este evento');
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Obtener todas las inscripciones de un usuario
  static async getByUserId(userId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      // Consulta principal con información del evento
      const queryText = `
        SELECT 
          i.id,
          i.user_id,
          i.event_id,
          i.fecha_inscripcion,
          i.created_at,
          i.updated_at,
          e.titulo as evento_titulo,
          e.descripcion as evento_descripcion,
          e.fecha_hora as evento_fecha,
          e.modalidad as evento_modalidad,
          e.lugar as evento_lugar,
          e.imagen_url as evento_imagen,
          e.tags as evento_tags,
          (SELECT COUNT(*) > 0 FROM evaluations ev WHERE ev.evento_id = i.event_id AND ev.usuario_id = i.user_id) as ha_evaluado
        FROM inscriptions i
        INNER JOIN eventos e ON i.event_id = e.id
        WHERE i.user_id = $1 AND e.activo = true
        ORDER BY i.fecha_inscripcion DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await query(queryText, [userId, limit, offset]);
      
      // Contar total de inscripciones
      const countQuery = `
        SELECT COUNT(*) as total
        FROM inscriptions i
        INNER JOIN eventos e ON i.event_id = e.id
        WHERE i.user_id = $1 AND e.activo = true
      `;
      const countResult = await query(countQuery, [userId]);
      const total = parseInt(countResult.rows[0].total);
      
      return {
        inscriptions: result.rows.map(row => ({
          id: row.id,
          user_id: row.user_id,
          event_id: row.event_id,
          fecha_inscripcion: row.fecha_inscripcion,
          created_at: row.created_at,
          updated_at: row.updated_at,
          ha_evaluado: row.ha_evaluado,
          evento: {
            id: row.event_id,
            titulo: row.evento_titulo,
            descripcion: row.evento_descripcion,
            fecha_hora: row.evento_fecha,
            modalidad: row.evento_modalidad,
            lugar: row.evento_lugar,
            imagen_url: row.evento_imagen,
            tags: row.evento_tags
          }
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Obtener todos los usuarios inscritos en un evento (para organizadores)
  static async getByEventId(eventId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      // Consulta principal con información del usuario
      const queryText = `
        SELECT 
          i.id,
          i.user_id,
          i.event_id,
          i.fecha_inscripcion,
          i.created_at,
          i.updated_at,
          u.nombre as usuario_nombre,
          u.correo as usuario_correo,
          p.avatar_url as usuario_avatar,
          p.phone_number as usuario_telefono
        FROM inscriptions i
        INNER JOIN users u ON i.user_id = u.id
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE i.event_id = $1
        ORDER BY i.fecha_inscripcion ASC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await query(queryText, [eventId, limit, offset]);
      
      // Contar total de inscripciones
      const countQuery = `
        SELECT COUNT(*) as total
        FROM inscriptions
        WHERE event_id = $1
      `;
      const countResult = await query(countQuery, [eventId]);
      const total = parseInt(countResult.rows[0].total);
      
      return {
        inscriptions: result.rows.map(row => ({
          id: row.id,
          user_id: row.user_id,
          event_id: row.event_id,
          fecha_inscripcion: row.fecha_inscripcion,
          created_at: row.created_at,
          updated_at: row.updated_at,
          usuario: {
            id: row.user_id,
            nombre: row.usuario_nombre,
            correo: row.usuario_correo,
            avatar_url: row.usuario_avatar,
            telefono: row.usuario_telefono
          }
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Obtener estadísticas de inscripciones de un evento
  static async getEventStats(eventId) {
    try {
      const queryText = `
        SELECT 
          COUNT(*) as total_inscripciones,
          MIN(fecha_inscripcion) as primera_inscripcion,
          MAX(fecha_inscripcion) as ultima_inscripcion
        FROM inscriptions
        WHERE event_id = $1
      `;
      
      const result = await query(queryText, [eventId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Obtener estadísticas de inscripciones de un usuario
  static async getUserStats(userId) {
    try {
      const queryText = `
        SELECT 
          COUNT(*) as total_inscripciones,
          MIN(fecha_inscripcion) as primera_inscripcion,
          MAX(fecha_inscripcion) as ultima_inscripcion
        FROM inscriptions i
        INNER JOIN eventos e ON i.event_id = e.id
        WHERE i.user_id = $1 AND e.activo = true
      `;
      
      const result = await query(queryText, [userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Inscription;
