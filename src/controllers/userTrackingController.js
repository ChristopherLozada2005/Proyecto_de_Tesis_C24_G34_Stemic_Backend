const { query } = require('../config/database');

class UserTrackingController {
  // Obtener seguimiento individual completo de un usuario
  static async getUserTracking(req, res) {
    try {
      const { user_id } = req.params;

      // Verificar que el usuario existe
      const userQuery = `
        SELECT u.id, u.nombre, u.correo, u.rol, u.created_at as fecha_registro
        FROM users u
        WHERE u.id = $1
      `;
      
      const userResult = await query(userQuery, [user_id]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      const user = userResult.rows[0];

      // Obtener perfil completo del usuario
      const profileQuery = `
        SELECT p.*, u.nombre, u.correo, u.created_at as fecha_registro
        FROM profiles p
        JOIN users u ON p.user_id = u.id
        WHERE p.user_id = $1
      `;
      
      const profileResult = await query(profileQuery, [user_id]);
      const profile = profileResult.rows[0] || null;

      // Obtener historial de inscripciones
      const inscriptionsQuery = `
        SELECT 
          i.id as inscription_id,
          i.fecha_inscripcion,
          e.id as evento_id,
          e.titulo as evento_titulo,
          e.fecha_hora as evento_fecha,
          e.modalidad,
          e.lugar,
          e.tags,
          e.skills
        FROM inscriptions i
        JOIN eventos e ON i.event_id = e.id
        WHERE i.user_id = $1
        ORDER BY i.fecha_inscripcion DESC
      `;
      
      const inscriptionsResult = await query(inscriptionsQuery, [user_id]);

      // Obtener historial de asistencia verificada
      const attendanceQuery = `
        SELECT 
          av.id as verification_id,
          av.verified_at,
          e.id as evento_id,
          e.titulo as evento_titulo,
          e.fecha_hora as evento_fecha,
          e.modalidad,
          e.lugar
        FROM attendance_verification av
        JOIN eventos e ON av.evento_id = e.id
        WHERE av.usuario_id = $1
        ORDER BY av.verified_at DESC
      `;
      
      const attendanceResult = await query(attendanceQuery, [user_id]);

      // Obtener historial de evaluaciones
      const evaluationsQuery = `
        SELECT 
          ev.id as evaluation_id,
          ev.created_at as fecha_evaluacion,
          e.id as evento_id,
          e.titulo as evento_titulo,
          e.fecha_hora as evento_fecha,
          ev.respuestas
        FROM evaluations ev
        JOIN eventos e ON ev.evento_id = e.id
        WHERE ev.usuario_id = $1
        ORDER BY ev.created_at DESC
      `;
      
      const evaluationsResult = await query(evaluationsQuery, [user_id]);

      // Obtener estadísticas de participación
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT i.id) as total_inscripciones,
          COUNT(DISTINCT av.id) as total_asistencias,
          COUNT(DISTINCT ev.id) as total_evaluaciones,
          CASE 
            WHEN COUNT(DISTINCT i.id) > 0 THEN 
              ROUND((COUNT(DISTINCT av.id)::numeric / COUNT(DISTINCT i.id)) * 100, 2)
            ELSE 0
          END as porcentaje_asistencia,
          CASE 
            WHEN COUNT(DISTINCT av.id) > 0 THEN 
              ROUND((COUNT(DISTINCT ev.id)::numeric / COUNT(DISTINCT av.id)) * 100, 2)
            ELSE 0
          END as porcentaje_evaluacion
        FROM inscriptions i
        LEFT JOIN attendance_verification av ON i.user_id = av.usuario_id AND i.event_id = av.evento_id
        LEFT JOIN evaluations ev ON i.user_id = ev.usuario_id AND i.event_id = ev.evento_id
        WHERE i.user_id = $1
      `;
      
      const statsResult = await query(statsQuery, [user_id]);
      const stats = statsResult.rows[0];

      // Obtener intereses más frecuentes
      const interestsQuery = `
        SELECT 
          unnest(e.tags) as interes,
          COUNT(*) as frecuencia
        FROM inscriptions i
        JOIN eventos e ON i.event_id = e.id
        WHERE i.user_id = $1
        GROUP BY unnest(e.tags)
        ORDER BY frecuencia DESC
        LIMIT 5
      `;
      
      const interestsResult = await query(interestsQuery, [user_id]);

      // Obtener postulación actual (si existe)
      const postulationQuery = `
        SELECT 
          p.id,
          p.carrera_especialidad,
          p.motivacion,
          p.estado,
          p.fecha_postulacion,
          p.fecha_revision,
          p.comentarios_revision,
          u.nombre as revisado_por_nombre
        FROM postulations p
        LEFT JOIN users u ON p.revisado_por = u.id
        WHERE p.user_id = $1
        ORDER BY p.fecha_postulacion DESC
        LIMIT 1
      `;
      
      const postulationResult = await query(postulationQuery, [user_id]);
      const postulation = postulationResult.rows[0] || null;

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            nombre: user.nombre,
            correo: user.correo,
            rol: user.rol,
            fecha_registro: user.fecha_registro
          },
          profile: profile,
          statistics: {
            total_inscripciones: parseInt(stats.total_inscripciones),
            total_asistencias: parseInt(stats.total_asistencias),
            total_evaluaciones: parseInt(stats.total_evaluaciones),
            porcentaje_asistencia: parseFloat(stats.porcentaje_asistencia),
            porcentaje_evaluacion: parseFloat(stats.porcentaje_evaluacion)
          },
          participation_history: {
            inscriptions: inscriptionsResult.rows,
            attendance: attendanceResult.rows,
            evaluations: evaluationsResult.rows
          },
          interests_analysis: {
            profile_interests: profile?.interests || [],
            frequent_interests: interestsResult.rows
          },
          current_postulation: postulation
        }
      });

    } catch (error) {
      console.error('Error al obtener seguimiento del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener resumen de actividad de un usuario
  static async getUserActivitySummary(req, res) {
    try {
      const { user_id } = req.params;

      // Verificar que el usuario existe
      const userExistsQuery = `SELECT id FROM users WHERE id = $1`;
      const userExists = await query(userExistsQuery, [user_id]);
      
      if (userExists.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Resumen de actividad por mes
      const activityQuery = `
        SELECT 
          DATE_TRUNC('month', i.fecha_inscripcion) as mes,
          COUNT(i.id) as inscripciones,
          COUNT(av.id) as asistencias,
          COUNT(ev.id) as evaluaciones
        FROM inscriptions i
        LEFT JOIN attendance_verification av ON i.user_id = av.usuario_id AND i.event_id = av.evento_id
        LEFT JOIN evaluations ev ON i.user_id = ev.usuario_id AND i.event_id = ev.evento_id
        WHERE i.user_id = $1
        GROUP BY DATE_TRUNC('month', i.fecha_inscripcion)
        ORDER BY mes DESC
        LIMIT 12
      `;
      
      const activityResult = await query(activityQuery, [user_id]);

      // Eventos más recientes
      const recentEventsQuery = `
        SELECT 
          e.titulo,
          e.fecha_hora,
          e.modalidad,
          i.fecha_inscripcion,
          av.verified_at as fecha_asistencia,
          ev.created_at as fecha_evaluacion
        FROM inscriptions i
        JOIN eventos e ON i.event_id = e.id
        LEFT JOIN attendance_verification av ON i.user_id = av.usuario_id AND i.event_id = av.evento_id
        LEFT JOIN evaluations ev ON i.user_id = ev.usuario_id AND i.event_id = ev.evento_id
        WHERE i.user_id = $1
        ORDER BY e.fecha_hora DESC
        LIMIT 5
      `;
      
      const recentEventsResult = await query(recentEventsQuery, [user_id]);

      res.json({
        success: true,
        data: {
          activity_by_month: activityResult.rows,
          recent_events: recentEventsResult.rows
        }
      });

    } catch (error) {
      console.error('Error al obtener resumen de actividad:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener análisis de intereses de un usuario
  static async getUserInterestsAnalysis(req, res) {
    try {
      const { user_id } = req.params;

      // Verificar que el usuario existe
      const userExistsQuery = `SELECT id FROM users WHERE id = $1`;
      const userExists = await query(userExistsQuery, [user_id]);
      
      if (userExists.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Intereses del perfil
      const profileInterestsQuery = `
        SELECT interests 
        FROM profiles 
        WHERE user_id = $1
      `;
      
      const profileInterestsResult = await query(profileInterestsQuery, [user_id]);
      const profileInterests = profileInterestsResult.rows[0]?.interests || [];

      // Intereses basados en participación
      const participationInterestsQuery = `
        SELECT 
          unnest(e.tags) as interes,
          COUNT(*) as participaciones,
          COUNT(av.id) as asistencias,
          COUNT(ev.id) as evaluaciones
        FROM inscriptions i
        JOIN eventos e ON i.event_id = e.id
        LEFT JOIN attendance_verification av ON i.user_id = av.usuario_id AND i.event_id = av.evento_id
        LEFT JOIN evaluations ev ON i.user_id = ev.usuario_id AND i.event_id = ev.evento_id
        WHERE i.user_id = $1
        GROUP BY unnest(e.tags)
        ORDER BY participaciones DESC, asistencias DESC
      `;
      
      const participationInterestsResult = await query(participationInterestsQuery, [user_id]);

      // Análisis de engagement por interés
      const engagementQuery = `
        SELECT 
          unnest(e.tags) as interes,
          ROUND(AVG(CASE WHEN ev.respuestas->>'pregunta_1' IS NOT NULL 
            THEN (ev.respuestas->>'pregunta_1')::numeric 
            ELSE NULL END), 2) as promedio_satisfaccion,
          COUNT(ev.id) as total_evaluaciones
        FROM inscriptions i
        JOIN eventos e ON i.event_id = e.id
        LEFT JOIN evaluations ev ON i.user_id = ev.usuario_id AND i.event_id = ev.evento_id
        WHERE i.user_id = $1
        GROUP BY unnest(e.tags)
        HAVING COUNT(ev.id) > 0
        ORDER BY promedio_satisfaccion DESC
      `;
      
      const engagementResult = await query(engagementQuery, [user_id]);

      res.json({
        success: true,
        data: {
          profile_interests: profileInterests,
          participation_interests: participationInterestsResult.rows,
          engagement_analysis: engagementResult.rows,
          interest_match: {
            declared_interests: profileInterests.length,
            active_interests: participationInterestsResult.rows.length,
            engagement_score: engagementResult.rows.length > 0 ? 
              engagementResult.rows.reduce((sum, row) => sum + parseFloat(row.promedio_satisfaccion || 0), 0) / engagementResult.rows.length : 0
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener análisis de intereses:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = UserTrackingController;
