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
}

module.exports = DashboardController;
