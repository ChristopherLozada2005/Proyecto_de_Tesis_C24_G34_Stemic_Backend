const Event = require('../models/Event');
const { query } = require('../config/database');

class RecommendationController {
  // Obtener eventos recomendados para un usuario
  static async getRecommendedEvents(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 10, offset = 0 } = req.query;

      // Obtener intereses del usuario
      const userInterestsQuery = `
        SELECT interests 
        FROM profiles 
        WHERE user_id = $1
      `;
      
      const userResult = await query(userInterestsQuery, [userId]);
      
      let userInterests = [];
      if (userResult.rows.length > 0) {
        userInterests = userResult.rows[0].interests || [];
      }

      // Si el usuario no tiene intereses, devolver eventos recientes (Usando Sequelize)
      if (userInterests.length === 0) {
        const recentEvents = await Event.findAll({
          limit: parseInt(limit),
          offset: parseInt(offset),
          orderBy: 'fecha_hora',
          order: 'ASC'
        });

        // Sequelize ya devuelve los tags como array gracias al modelo
        return res.json({
          success: true,
          data: {
            events: recentEvents,
            total: recentEvents.length,
            recommendation_type: 'recent_events'
          }
        });
      }

      // Consulta SQL para recomendación por intereses
      const recommendationQuery = `
        SELECT 
          e.*,
          CASE 
            WHEN e.tags && $1 THEN 
              (SELECT COUNT(*) FROM unnest(e.tags) AS tag WHERE tag = ANY($1))::float / array_length($1, 1)
            ELSE 0
          END as relevancia,
          (SELECT COUNT(*) FROM unnest(e.tags) AS tag WHERE tag = ANY($1)) as intereses_coincidentes
        FROM eventos e
        WHERE e.activo = true 
          AND e.fecha_hora > NOW()
        ORDER BY 
          relevancia DESC,
          intereses_coincidentes DESC,
          e.fecha_hora ASC
        LIMIT $2 OFFSET $3
      `;

      const result = await query(recommendationQuery, [
        userInterests,
        parseInt(limit),
        parseInt(offset)
      ]);

      // --- CORRECCIÓN CLAVE ---
      // Procesamos las filas crudas para asegurar que 'tags' sea un Array válido
      const formattedEvents = result.rows.map(event => {
        let tags = event.tags;
        
        // Si es null o undefined, lo convertimos a array vacío
        if (!tags) {
          tags = [];
        } 
        // Si por alguna razón la BD lo devuelve como string (ej: "{IA,TECH}"), lo parseamos
        else if (typeof tags === 'string') {
          // Elimina llaves {} y separa por comas
          tags = tags.replace(/[{}]/g, '').split(',').map(t => t.trim()).filter(Boolean);
        }
        
        return {
          ...event,
          tags: tags // Aseguramos que siempre va como array
        };
      });
      // ------------------------

      // Obtener total
      const totalQuery = `
        SELECT COUNT(*) as total
        FROM eventos e
        WHERE e.activo = true 
          AND e.fecha_hora > NOW()
          AND e.tags && $1
      `;

      const totalResult = await query(totalQuery, [userInterests]);
      const total = parseInt(totalResult.rows[0].total);

      res.json({
        success: true,
        data: {
          events: formattedEvents, // Enviamos los eventos formateados
          total: total,
          recommendation_type: 'interest_based',
          user_interests: userInterests
        }
      });

    } catch (error) {
      console.error('Error al obtener recomendaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // ... (Resto de los métodos getEventsByInterest y getRecommendationStats se mantienen igual) ...
  // Asegúrate de aplicar la misma lógica de "formattedEvents" en getEventsByInterest si notas el mismo error allí.

  // Obtener eventos por interés específico
  static async getEventsByInterest(req, res) {
    try {
      const { interest } = req.params;
      const { limit = 10, offset = 0 } = req.query;

      const validInterests = ['ia', 'tech', 'networking'];
      if (!validInterests.includes(interest.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Interés no válido. Valores permitidos: ia, tech, networking'
        });
      }

      const eventsQuery = `
        SELECT e.*
        FROM eventos e
        WHERE e.activo = true 
          AND e.fecha_hora > NOW()
          AND $1 = ANY(e.tags)
        ORDER BY e.fecha_hora ASC
        LIMIT $2 OFFSET $3
      `;

      const result = await query(eventsQuery, [
        interest.toLowerCase(),
        parseInt(limit),
        parseInt(offset)
      ]);

      // Aplicamos la misma corrección aquí por seguridad
      const formattedEvents = result.rows.map(event => {
        let tags = event.tags;
        if (!tags) tags = [];
        else if (typeof tags === 'string') {
          tags = tags.replace(/[{}]/g, '').split(',').map(t => t.trim()).filter(Boolean);
        }
        return { ...event, tags };
      });

      const totalQuery = `
        SELECT COUNT(*) as total
        FROM eventos e
        WHERE e.activo = true 
          AND e.fecha_hora > NOW()
          AND $1 = ANY(e.tags)
      `;

      const totalResult = await query(totalQuery, [interest.toLowerCase()]);
      const total = parseInt(totalResult.rows[0].total);

      res.json({
        success: true,
        data: {
          events: formattedEvents,
          total: total,
          interest: interest.toLowerCase()
        }
      });

    } catch (error) {
      console.error('Error al obtener eventos por interés:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // ... (getRecommendationStats sigue igual) ...
  static async getRecommendationStats(req, res) {
     // ... (Mismo código de tu versión anterior corregida)
     try {
      const userId = req.user.id;
      const userInterestsQuery = `SELECT interests FROM profiles WHERE user_id = $1`;
      const userResult = await query(userInterestsQuery, [userId]);
      
      let userInterests = [];
      if (userResult.rows.length > 0) {
        userInterests = userResult.rows[0].interests || [];
      }

      const statsQuery = `
        SELECT 
          unnest(e.tags) as tag,
          COUNT(*) as total_eventos,
          COUNT(CASE WHEN e.fecha_hora > NOW() THEN 1 END) as eventos_futuros
        FROM eventos e
        WHERE e.activo = true
        GROUP BY unnest(e.tags)
        ORDER BY total_eventos DESC
      `;
      const statsResult = await query(statsQuery);

      const recommendationsQuery = `
        SELECT COUNT(*) as total_recomendaciones
        FROM eventos e
        WHERE e.activo = true 
          AND e.fecha_hora > NOW()
          AND e.tags && $1
      `;
      const recommendationsResult = await query(recommendationsQuery, [userInterests]);

      res.json({
        success: true,
        data: {
          user_interests: userInterests,
          total_recommendations: parseInt(recommendationsResult.rows[0].total_recomendaciones),
          stats_by_interest: statsResult.rows,
          has_interests: userInterests.length > 0
        }
      });

    } catch (error) {
      console.error('Error al obtener estadísticas de recomendaciones:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }
}

module.exports = RecommendationController;
