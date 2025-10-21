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
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Perfil de usuario no encontrado'
        });
      }

      const userInterests = userResult.rows[0].interests || [];

      // Si el usuario no tiene intereses, devolver eventos recientes
      if (userInterests.length === 0) {
        const recentEvents = await Event.findAll({
          limit: parseInt(limit),
          offset: parseInt(offset),
          orderBy: 'fecha_hora',
          order: 'ASC'
        });

        return res.json({
          success: true,
          data: {
            events: recentEvents,
            total: recentEvents.length,
            recommendation_type: 'recent_events'
          }
        });
      }

      // Obtener eventos recomendados basados en intereses
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

      // Obtener total de eventos recomendados para paginación
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
          events: result.rows,
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

  // Obtener eventos por interés específico
  static async getEventsByInterest(req, res) {
    try {
      const { interest } = req.params;
      const { limit = 10, offset = 0 } = req.query;

      // Validar que el interés sea válido
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

      // Obtener total para paginación
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
          events: result.rows,
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

  // Obtener estadísticas de recomendaciones para un usuario
  static async getRecommendationStats(req, res) {
    try {
      const userId = req.user.id;

      // Obtener intereses del usuario
      const userInterestsQuery = `
        SELECT interests 
        FROM profiles 
        WHERE user_id = $1
      `;
      
      const userResult = await query(userInterestsQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Perfil de usuario no encontrado'
        });
      }

      const userInterests = userResult.rows[0].interests || [];

      // Estadísticas por interés
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

      // Calcular recomendaciones disponibles
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
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = RecommendationController;
