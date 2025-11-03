const { query } = require('../config/database');
const Event = require('../models/Event');
const Evaluation = require('../models/Evaluation');
const Inscription = require('../models/Inscription');
const AttendanceVerification = require('../models/AttendanceVerification');
const User = require('../models/User');
const Postulation = require('../models/Postulation');

class DashboardController {
  // Obtener métricas generales del sistema (dashboard principal)
  static async getSystemMetrics(req, res) {
    try {
      // 1. Estadísticas generales de eventos
      const eventsStatsQuery = `
        SELECT 
          COUNT(*) as total_eventos,
          COUNT(CASE WHEN fecha_hora <= NOW() THEN 1 END) as eventos_realizados,
          COUNT(CASE WHEN fecha_hora > NOW() THEN 1 END) as eventos_programados,
          COUNT(CASE WHEN modalidad = 'presencial' THEN 1 END) as eventos_presenciales,
          COUNT(CASE WHEN modalidad = 'virtual' THEN 1 END) as eventos_virtuales,
          COUNT(CASE WHEN modalidad = 'hibrido' THEN 1 END) as eventos_hibridos
        FROM eventos 
        WHERE activo = true
      `;
      const eventsStatsResult = await query(eventsStatsQuery);
      const eventsStats = eventsStatsResult.rows[0];

      // 2. Estadísticas de participación
      const participationStatsQuery = `
        SELECT 
          COUNT(DISTINCT i.id) as total_inscripciones,
          COUNT(DISTINCT av.id) as total_asistencias,
          COUNT(DISTINCT ev.id) as total_evaluaciones,
          COUNT(DISTINCT i.user_id) as usuarios_unicos_inscritos,
          COUNT(DISTINCT av.usuario_id) as usuarios_unicos_asistentes,
          COUNT(DISTINCT ev.usuario_id) as usuarios_unicos_evaluadores
        FROM inscriptions i
        LEFT JOIN attendance_verification av ON i.user_id = av.usuario_id AND i.event_id = av.evento_id
        LEFT JOIN evaluations ev ON i.user_id = ev.usuario_id AND i.event_id = ev.evento_id
      `;
      const participationStatsResult = await query(participationStatsQuery);
      const participationStats = participationStatsResult.rows[0];

      // 3. Satisfacción general del sistema
      const satisfactionStatsQuery = `
        SELECT 
          ROUND(AVG((respuestas->>'pregunta_1')::numeric), 2) as satisfaccion_general,
          ROUND(AVG((respuestas->>'pregunta_2')::numeric), 2) as cumplio_expectativas,
          ROUND(AVG((respuestas->>'pregunta_3')::numeric), 2) as recomendacion,
          ROUND(AVG((respuestas->>'pregunta_4')::numeric), 2) as calidad_contenido,
          ROUND(AVG((respuestas->>'pregunta_5')::numeric), 2) as claridad_presentacion,
          ROUND(AVG((respuestas->>'pregunta_6')::numeric), 2) as utilidad_contenido,
          ROUND(AVG((respuestas->>'pregunta_7')::numeric), 2) as organizacion,
          ROUND(AVG((respuestas->>'pregunta_8')::numeric), 2) as aprendizaje,
          ROUND(AVG((respuestas->>'pregunta_9')::numeric), 2) as desarrollo_habilidades,
          ROUND(AVG((respuestas->>'pregunta_10')::numeric), 2) as aplicacion,
          ROUND(AVG((respuestas->>'pregunta_11')::numeric), 2) as motivacion,
          ROUND(AVG((respuestas->>'pregunta_12')::numeric), 2) as interes_futuro
        FROM evaluations
        WHERE respuestas->>'pregunta_1' IS NOT NULL
      `;
      const satisfactionStatsResult = await query(satisfactionStatsQuery);
      const satisfactionStats = satisfactionStatsResult.rows[0];

      // 4. Distribución de eventos por skills/tags
      const skillsDistributionQuery = `
        SELECT 
          unnest(tags) as skill,
          COUNT(*) as cantidad_eventos,
          ROUND((COUNT(*)::numeric / (SELECT COUNT(*) FROM eventos WHERE activo = true)) * 100, 2) as porcentaje
        FROM eventos 
        WHERE activo = true
        GROUP BY unnest(tags)
        ORDER BY cantidad_eventos DESC
      `;
      const skillsDistributionResult = await query(skillsDistributionQuery);

      // 5. Estadísticas de usuarios
      const usersStatsQuery = `
        SELECT 
          COUNT(*) as total_usuarios,
          COUNT(CASE WHEN rol = 'admin' THEN 1 END) as admins,
          COUNT(CASE WHEN rol = 'organizador' THEN 1 END) as organizadores,
          COUNT(CASE WHEN rol = 'usuario' THEN 1 END) as usuarios_regulares,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as usuarios_nuevos_mes
        FROM users
      `;
      const usersStatsResult = await query(usersStatsQuery);
      const usersStats = usersStatsResult.rows[0];

      // 6. Estadísticas de postulaciones
      const postulationsStatsQuery = `
        SELECT 
          COUNT(*) as total_postulaciones,
          COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
          COUNT(CASE WHEN estado = 'aprobada' THEN 1 END) as aprobadas,
          COUNT(CASE WHEN estado = 'rechazada' THEN 1 END) as rechazadas
        FROM postulations
      `;
      const postulationsStatsResult = await query(postulationsStatsQuery);
      const postulationsStats = postulationsStatsResult.rows[0];

      // 7. Eventos más populares (por inscripciones)
      const popularEventsQuery = `
        SELECT 
          e.id,
          e.titulo,
          e.fecha_hora,
          e.modalidad,
          COUNT(i.id) as total_inscripciones,
          COUNT(av.id) as total_asistencias,
          COUNT(ev.id) as total_evaluaciones,
          CASE 
            WHEN COUNT(i.id) > 0 THEN ROUND((COUNT(av.id)::numeric / COUNT(i.id)) * 100, 2)
            ELSE 0
          END as porcentaje_asistencia
        FROM eventos e
        LEFT JOIN inscriptions i ON e.id = i.event_id
        LEFT JOIN attendance_verification av ON i.user_id = av.usuario_id AND i.event_id = av.evento_id
        LEFT JOIN evaluations ev ON i.user_id = ev.usuario_id AND i.event_id = ev.evento_id
        WHERE e.activo = true
        GROUP BY e.id, e.titulo, e.fecha_hora, e.modalidad
        ORDER BY total_inscripciones DESC
        LIMIT 10
      `;
      const popularEventsResult = await query(popularEventsQuery);

      // 8. Tendencias mensuales (últimos 12 meses)
      const monthlyTrendsQuery = `
        SELECT 
          TO_CHAR(date_trunc('month', e.fecha_hora), 'YYYY-MM') as mes,
          COUNT(e.id) as eventos_realizados,
          COUNT(i.id) as inscripciones,
          COUNT(av.id) as asistencias,
          COUNT(ev.id) as evaluaciones
        FROM eventos e
        LEFT JOIN inscriptions i ON e.id = i.event_id
        LEFT JOIN attendance_verification av ON i.user_id = av.usuario_id AND i.event_id = av.evento_id
        LEFT JOIN evaluations ev ON i.user_id = ev.usuario_id AND i.event_id = ev.evento_id
        WHERE e.activo = true 
          AND e.fecha_hora >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY TO_CHAR(date_trunc('month', e.fecha_hora), 'YYYY-MM')
        ORDER BY mes DESC
      `;
      const monthlyTrendsResult = await query(monthlyTrendsQuery);

      // Calcular porcentajes de asistencia y evaluación
      const attendanceRate = participationStats.total_inscripciones > 0 
        ? Math.round((participationStats.total_asistencias / participationStats.total_inscripciones) * 100 * 100) / 100
        : 0;
      
      const evaluationRate = participationStats.total_asistencias > 0 
        ? Math.round((participationStats.total_evaluaciones / participationStats.total_asistencias) * 100 * 100) / 100
        : 0;

      res.json({
        success: true,
        data: {
          // Métricas principales
          overview: {
            total_eventos: parseInt(eventsStats.total_eventos),
            eventos_realizados: parseInt(eventsStats.eventos_realizados),
            eventos_programados: parseInt(eventsStats.eventos_programados),
            total_inscripciones: parseInt(participationStats.total_inscripciones),
            total_asistencias: parseInt(participationStats.total_asistencias),
            total_evaluaciones: parseInt(participationStats.total_evaluaciones),
            usuarios_unicos: parseInt(participationStats.usuarios_unicos_inscritos),
            porcentaje_asistencia: attendanceRate,
            porcentaje_evaluacion: evaluationRate
          },
          
          // Distribución por modalidad
          modalidad_distribution: {
            presencial: parseInt(eventsStats.eventos_presenciales),
            virtual: parseInt(eventsStats.eventos_virtuales),
            hibrido: parseInt(eventsStats.eventos_hibridos)
          },
          
          // Satisfacción general
          satisfaccion_general: {
            promedio_general: parseFloat(satisfactionStats.satisfaccion_general || 0),
            cumplio_expectativas: parseFloat(satisfactionStats.cumplio_expectativas || 0),
            recomendacion: parseFloat(satisfactionStats.recomendacion || 0),
            calidad_contenido: parseFloat(satisfactionStats.calidad_contenido || 0),
            claridad_presentacion: parseFloat(satisfactionStats.claridad_presentacion || 0),
            utilidad_contenido: parseFloat(satisfactionStats.utilidad_contenido || 0),
            organizacion: parseFloat(satisfactionStats.organizacion || 0),
            aprendizaje: parseFloat(satisfactionStats.aprendizaje || 0),
            desarrollo_habilidades: parseFloat(satisfactionStats.desarrollo_habilidades || 0),
            aplicacion: parseFloat(satisfactionStats.aplicacion || 0),
            motivacion: parseFloat(satisfactionStats.motivacion || 0),
            interes_futuro: parseFloat(satisfactionStats.interes_futuro || 0)
          },
          
          // Distribución por skills (para gráfico de barras)
          skills_distribution: skillsDistributionResult.rows.map(row => ({
            skill: row.skill,
            cantidad_eventos: parseInt(row.cantidad_eventos),
            porcentaje: parseFloat(row.porcentaje)
          })),
          
          // Estadísticas de usuarios
          usuarios: {
            total: parseInt(usersStats.total_usuarios),
            admins: parseInt(usersStats.admins),
            organizadores: parseInt(usersStats.organizadores),
            usuarios_regulares: parseInt(usersStats.usuarios_regulares),
            usuarios_nuevos_mes: parseInt(usersStats.usuarios_nuevos_mes)
          },
          
          // Estadísticas de postulaciones
          postulaciones: {
            total: parseInt(postulationsStats.total_postulaciones),
            pendientes: parseInt(postulationsStats.pendientes),
            aprobadas: parseInt(postulationsStats.aprobadas),
            rechazadas: parseInt(postulationsStats.rechazadas)
          },
          
          // Eventos más populares
          eventos_populares: popularEventsResult.rows.map(row => ({
            id: row.id,
            titulo: row.titulo,
            fecha_hora: row.fecha_hora,
            modalidad: row.modalidad,
            total_inscripciones: parseInt(row.total_inscripciones),
            total_asistencias: parseInt(row.total_asistencias),
            total_evaluaciones: parseInt(row.total_evaluaciones),
            porcentaje_asistencia: parseFloat(row.porcentaje_asistencia)
          })),
          
          // Tendencias mensuales
          tendencias_mensuales: monthlyTrendsResult.rows.map(row => ({
            mes: row.mes,
            eventos_realizados: parseInt(row.eventos_realizados),
            inscripciones: parseInt(row.inscripciones),
            asistencias: parseInt(row.asistencias),
            evaluaciones: parseInt(row.evaluaciones)
          }))
        }
      });

    } catch (error) {
      console.error('Error al obtener métricas del sistema:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener métricas específicas por período
  static async getSystemMetricsByPeriod(req, res) {
    try {
      const { fecha_desde, fecha_hasta } = req.query;
      
      if (!fecha_desde || !fecha_hasta) {
        return res.status(400).json({
          success: false,
          message: 'Fechas desde y hasta son requeridas'
        });
      }

      // Similar a getSystemMetrics pero filtrado por fechas
      const eventsStatsQuery = `
        SELECT 
          COUNT(*) as total_eventos,
          COUNT(CASE WHEN fecha_hora <= NOW() THEN 1 END) as eventos_realizados,
          COUNT(CASE WHEN fecha_hora > NOW() THEN 1 END) as eventos_programados
        FROM eventos 
        WHERE activo = true 
          AND fecha_hora >= $1 
          AND fecha_hora <= $2
      `;
      const eventsStatsResult = await query(eventsStatsQuery, [fecha_desde, fecha_hasta]);
      const eventsStats = eventsStatsResult.rows[0];

      // Resto de consultas similares pero con filtros de fecha...
      // (Implementación similar pero con filtros de fecha)

      res.json({
        success: true,
        data: {
          periodo: { fecha_desde, fecha_hasta },
          eventos: {
            total: parseInt(eventsStats.total_eventos),
            realizados: parseInt(eventsStats.eventos_realizados),
            programados: parseInt(eventsStats.eventos_programados)
          }
          // ... más métricas filtradas por fecha
        }
      });

    } catch (error) {
      console.error('Error al obtener métricas por período:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener métricas detalladas de un evento específico
  static async getEventMetrics(req, res) {
    const { eventId } = req.params;

    try {
      const eventResult = await query(
        `SELECT e.id,
                e.titulo,
                e.fecha_hora,
                e.modalidad,
                e.lugar,
                e.created_by,
                e.imagen_url,
                u.nombre AS organizer_nombre
         FROM eventos e
         LEFT JOIN users u ON u.id = e.created_by
         WHERE e.id = $1 AND e.activo = true`,
        [eventId]
      );

      if (eventResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        });
      }

      const event = eventResult.rows[0];

      const [overviewResult, satisfactionResult, timelineResult, recentRegistrationsResult, recentAttendanceResult, recentEvaluationsResult, feedbackResult, eventPostulationStatsResult, recentEventPostulationsResult] = await Promise.all([
        query(
          `SELECT 
              COUNT(DISTINCT i.id) AS total_inscripciones,
              COUNT(DISTINCT av.id) AS total_asistencias,
              COUNT(DISTINCT ev.id) AS total_evaluaciones,
              COUNT(DISTINCT i.user_id) AS usuarios_unicos_inscritos,
              COUNT(DISTINCT av.usuario_id) AS usuarios_unicos_asistentes,
              COUNT(DISTINCT ev.usuario_id) AS usuarios_unicos_evaluadores
           FROM eventos e
           LEFT JOIN inscriptions i ON e.id = i.event_id
           LEFT JOIN attendance_verification av ON e.id = av.evento_id
           LEFT JOIN evaluations ev ON e.id = ev.evento_id
           WHERE e.id = $1`,
          [eventId]
        ),
        query(
          `SELECT 
              COUNT(*) AS total_respuestas,
              ROUND(AVG((respuestas->>'pregunta_1')::numeric), 2) AS promedio_general,
              ROUND(AVG((respuestas->>'pregunta_2')::numeric), 2) AS cumplio_expectativas,
              ROUND(AVG((respuestas->>'pregunta_3')::numeric), 2) AS recomendacion,
              ROUND(AVG((respuestas->>'pregunta_4')::numeric), 2) AS calidad_contenido,
              ROUND(AVG((respuestas->>'pregunta_5')::numeric), 2) AS claridad_presentacion,
              ROUND(AVG((respuestas->>'pregunta_6')::numeric), 2) AS utilidad_contenido,
              ROUND(AVG((respuestas->>'pregunta_7')::numeric), 2) AS organizacion,
              ROUND(AVG((respuestas->>'pregunta_8')::numeric), 2) AS aprendizaje,
              ROUND(AVG((respuestas->>'pregunta_9')::numeric), 2) AS desarrollo_habilidades,
              ROUND(AVG((respuestas->>'pregunta_10')::numeric), 2) AS aplicacion,
              ROUND(AVG((respuestas->>'pregunta_11')::numeric), 2) AS motivacion,
              ROUND(AVG((respuestas->>'pregunta_12')::numeric), 2) AS interes_futuro
           FROM evaluations
           WHERE evento_id = $1`,
          [eventId]
        ),
        query(
          `SELECT fecha,
                  SUM(total_inscripciones) AS total_inscripciones,
                  SUM(total_asistencias) AS total_asistencias
           FROM (
             SELECT TO_CHAR(date_trunc('day', i.created_at), 'YYYY-MM-DD') AS fecha,
                    COUNT(*) AS total_inscripciones,
                    0 AS total_asistencias
             FROM inscriptions i
             WHERE i.event_id = $1
             GROUP BY fecha
             UNION ALL
             SELECT TO_CHAR(date_trunc('day', av.verified_at), 'YYYY-MM-DD') AS fecha,
                    0 AS total_inscripciones,
                    COUNT(*) AS total_asistencias
             FROM attendance_verification av
             WHERE av.evento_id = $1
             GROUP BY fecha
           ) datos
           GROUP BY fecha
           ORDER BY fecha ASC`,
          [eventId]
        ),
        query(
          `SELECT i.id, i.created_at, u.nombre, u.correo
           FROM inscriptions i
           JOIN users u ON i.user_id = u.id
           WHERE i.event_id = $1
           ORDER BY i.created_at DESC
           LIMIT 8`,
          [eventId]
        ),
        query(
          `SELECT av.id, av.verified_at, u.nombre, u.correo
           FROM attendance_verification av
           JOIN users u ON av.usuario_id = u.id
           WHERE av.evento_id = $1
           ORDER BY av.verified_at DESC
           LIMIT 8`,
          [eventId]
        ),
        query(
          `SELECT ev.id, ev.created_at, u.nombre, u.correo,
                  (ev.respuestas->>'pregunta_1')::numeric AS calificacion_general
           FROM evaluations ev
           JOIN users u ON ev.usuario_id = u.id
           WHERE ev.evento_id = $1
           ORDER BY ev.created_at DESC
           LIMIT 8`,
          [eventId]
        ),
        query(
          `SELECT ev.id, ev.created_at, u.nombre,
                  ev.respuestas->>'pregunta_13' AS lo_que_mas_gusto,
                  ev.respuestas->>'pregunta_14' AS aspectos_mejorar,
                  ev.respuestas->>'pregunta_15' AS sugerencias
           FROM evaluations ev
           JOIN users u ON ev.usuario_id = u.id
           WHERE ev.evento_id = $1
             AND ((ev.respuestas->>'pregunta_13') IS NOT NULL OR (ev.respuestas->>'pregunta_14') IS NOT NULL OR (ev.respuestas->>'pregunta_15') IS NOT NULL)
           ORDER BY ev.created_at DESC
           LIMIT 10`,
          [eventId]
        ),
        query(
          `SELECT 
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes,
              COUNT(*) FILTER (WHERE estado = 'en_revision') AS en_revision,
              COUNT(*) FILTER (WHERE estado = 'preseleccionado') AS preseleccionados,
              COUNT(*) FILTER (WHERE estado = 'aprobado') AS aprobados,
              COUNT(*) FILTER (WHERE estado = 'rechazado') AS rechazados
           FROM event_postulations
           WHERE event_id = $1`,
          [eventId]
        ),
        query(
          `SELECT ep.id, ep.estado, ep.fecha_postulacion, u.nombre, u.correo
           FROM event_postulations ep
           JOIN users u ON ep.user_id = u.id
           WHERE ep.event_id = $1
           ORDER BY ep.fecha_postulacion DESC
           LIMIT 10`,
          [eventId]
        )
      ]);

      const overviewRow = overviewResult.rows[0] || {};
      const satisfactionRow = satisfactionResult.rows[0] || {};

      const totalInscripciones = parseInt(overviewRow.total_inscripciones || 0, 10);
      const totalAsistencias = parseInt(overviewRow.total_asistencias || 0, 10);
      const totalEvaluaciones = parseInt(overviewRow.total_evaluaciones || 0, 10);

      const porcentajeAsistencia = totalInscripciones > 0
        ? Math.round((totalAsistencias / totalInscripciones) * 10000) / 100
        : 0;

      const porcentajeEvaluacion = totalAsistencias > 0
        ? Math.round((totalEvaluaciones / Math.max(totalAsistencias, 1)) * 10000) / 100
        : 0;

      res.json({
        success: true,
        data: {
          event: {
            id: event.id,
            titulo: event.titulo,
            fecha_hora: event.fecha_hora,
            modalidad: event.modalidad,
            lugar: event.lugar,
            imagen_url: event.imagen_url,
            organizer_nombre: event.organizer_nombre
          },
          overview: {
            total_inscripciones: totalInscripciones,
            total_asistencias: totalAsistencias,
            total_evaluaciones: totalEvaluaciones,
            usuarios_unicos_inscritos: parseInt(overviewRow.usuarios_unicos_inscritos || 0, 10),
            usuarios_unicos_asistentes: parseInt(overviewRow.usuarios_unicos_asistentes || 0, 10),
            usuarios_unicos_evaluadores: parseInt(overviewRow.usuarios_unicos_evaluadores || 0, 10),
            porcentaje_asistencia: porcentajeAsistencia,
            porcentaje_evaluacion: porcentajeEvaluacion
          },
          satisfaction: {
            total_respuestas: parseInt(satisfactionRow.total_respuestas || 0, 10),
            promedio_general: parseFloat(satisfactionRow.promedio_general || 0),
            cumplio_expectativas: parseFloat(satisfactionRow.cumplio_expectativas || 0),
            recomendacion: parseFloat(satisfactionRow.recomendacion || 0),
            calidad_contenido: parseFloat(satisfactionRow.calidad_contenido || 0),
            claridad_presentacion: parseFloat(satisfactionRow.claridad_presentacion || 0),
            utilidad_contenido: parseFloat(satisfactionRow.utilidad_contenido || 0),
            organizacion: parseFloat(satisfactionRow.organizacion || 0),
            aprendizaje: parseFloat(satisfactionRow.aprendizaje || 0),
            desarrollo_habilidades: parseFloat(satisfactionRow.desarrollo_habilidades || 0),
            aplicacion: parseFloat(satisfactionRow.aplicacion || 0),
            motivacion: parseFloat(satisfactionRow.motivacion || 0),
            interes_futuro: parseFloat(satisfactionRow.interes_futuro || 0)
          },
          timeline: timelineResult.rows.map(row => ({
            fecha: row.fecha,
            inscripciones: parseInt(row.total_inscripciones || 0, 10),
            asistencias: parseInt(row.total_asistencias || 0, 10)
          })),
          recent_activity: {
            inscripciones: recentRegistrationsResult.rows.map(row => ({
              id: row.id,
              nombre: row.nombre,
              correo: row.correo,
              fecha: row.created_at
            })),
            asistencias: recentAttendanceResult.rows.map(row => ({
              id: row.id,
              nombre: row.nombre,
              correo: row.correo,
              fecha: row.verified_at
            })),
            evaluaciones: recentEvaluationsResult.rows.map(row => ({
              id: row.id,
              nombre: row.nombre,
              correo: row.correo,
              calificacion_general: row.calificacion_general ? Number(row.calificacion_general) : null,
              fecha: row.created_at
            }))
          },
          feedback: feedbackResult.rows.map(row => ({
            id: row.id,
            nombre: row.nombre,
            fecha: row.created_at,
            lo_que_mas_gusto: row.lo_que_mas_gusto,
            aspectos_mejorar: row.aspectos_mejorar,
            sugerencias: row.sugerencias
          })),
          postulaciones: {
            resumen: {
              total: parseInt(eventPostulationStatsResult.rows?.[0]?.total || 0, 10),
              pendientes: parseInt(eventPostulationStatsResult.rows?.[0]?.pendientes || 0, 10),
              en_revision: parseInt(eventPostulationStatsResult.rows?.[0]?.en_revision || 0, 10),
              preseleccionados: parseInt(eventPostulationStatsResult.rows?.[0]?.preseleccionados || 0, 10),
              aprobados: parseInt(eventPostulationStatsResult.rows?.[0]?.aprobados || 0, 10),
              rechazados: parseInt(eventPostulationStatsResult.rows?.[0]?.rechazados || 0, 10)
            },
            recientes: recentEventPostulationsResult.rows.map(row => ({
              id: row.id,
              estado: row.estado,
              fecha_postulacion: row.fecha_postulacion,
              nombre: row.nombre,
              correo: row.correo
            }))
          }
        }
      });

    } catch (error) {
      console.error('Error al obtener métricas del evento:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = DashboardController;
