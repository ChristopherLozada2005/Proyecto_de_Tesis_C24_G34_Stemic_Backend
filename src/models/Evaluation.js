const { query, getClient } = require('../config/database');

class Evaluation {
  constructor(evaluationData) {
    this.id = evaluationData.id;
    this.evento_id = evaluationData.evento_id;
    this.usuario_id = evaluationData.usuario_id;
    this.respuestas = evaluationData.respuestas; // JSON con todas las respuestas
    this.created_at = evaluationData.created_at;
    this.updated_at = evaluationData.updated_at;
  }

  // Crear una nueva evaluación
  static async create(evaluationData) {
    const {
      evento_id,
      usuario_id,
      respuestas
    } = evaluationData;

    // Verificar que el evento existe y está finalizado
    const eventQuery = `
      SELECT id, fecha_hora, activo 
      FROM eventos 
      WHERE id = $1 AND activo = true
    `;
    const eventResult = await query(eventQuery, [evento_id]);
    
    if (eventResult.rows.length === 0) {
      throw new Error('Evento no encontrado');
    }

    const event = eventResult.rows[0];
    const now = new Date();
    const eventDate = new Date(event.fecha_hora);
    
    // Verificar que el evento ya haya terminado (fecha_hora + duración)
    if (eventDate > now) {
      throw new Error('El evento aún no ha finalizado');
    }

    // Verificar que el usuario no haya evaluado ya este evento
    const existingEvaluation = await Evaluation.findByUserAndEvent(usuario_id, evento_id);
    if (existingEvaluation) {
      throw new Error('Ya has evaluado este evento');
    }

    const queryText = `
      INSERT INTO evaluations (evento_id, usuario_id, respuestas)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const values = [
      evento_id,
      usuario_id,
      JSON.stringify(respuestas)
    ];

    const result = await query(queryText, values);
    return new Evaluation(result.rows[0]);
  }

  // Obtener evaluación por usuario y evento
  static async findByUserAndEvent(usuario_id, evento_id) {
    const queryText = `
      SELECT * FROM evaluations 
      WHERE usuario_id = $1 AND evento_id = $2
    `;
    const result = await query(queryText, [usuario_id, evento_id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new Evaluation(result.rows[0]);
  }

  // Obtener todas las evaluaciones de un evento
  static async findByEvent(evento_id) {
    const queryText = `
      SELECT e.*, u.nombre, u.correo
      FROM evaluations e
      JOIN users u ON e.usuario_id = u.id
      WHERE e.evento_id = $1
      ORDER BY e.created_at DESC
    `;
    const result = await query(queryText, [evento_id]);
    return result.rows.map(row => new Evaluation(row));
  }

  // Obtener evaluaciones de un usuario
  static async findByUser(usuario_id) {
    const queryText = `
      SELECT e.*, ev.titulo as evento_titulo, ev.fecha_hora as evento_fecha
      FROM evaluations e
      JOIN eventos ev ON e.evento_id = ev.id
      WHERE e.usuario_id = $1
      ORDER BY e.created_at DESC
    `;
    const result = await query(queryText, [usuario_id]);
    return result.rows.map(row => new Evaluation(row));
  }

  // Obtener estadísticas de evaluaciones de un evento
  static async getEventStats(evento_id) {
    const queryText = `
      SELECT 
        COUNT(*) as total_evaluaciones,
        AVG((respuestas->>'pregunta_1')::numeric) as promedio_calificacion_general,
        AVG((respuestas->>'pregunta_2')::numeric) as promedio_cumplio_expectativas,
        AVG((respuestas->>'pregunta_3')::numeric) as promedio_recomendacion,
        AVG((respuestas->>'pregunta_4')::numeric) as promedio_calidad_contenido,
        AVG((respuestas->>'pregunta_5')::numeric) as promedio_claridad_presentacion,
        AVG((respuestas->>'pregunta_6')::numeric) as promedio_utilidad_contenido,
        AVG((respuestas->>'pregunta_7')::numeric) as promedio_organizacion,
        AVG((respuestas->>'pregunta_8')::numeric) as promedio_aprendizaje,
        AVG((respuestas->>'pregunta_9')::numeric) as promedio_desarrollo_habilidades,
        AVG((respuestas->>'pregunta_10')::numeric) as promedio_aplicacion,
        AVG((respuestas->>'pregunta_11')::numeric) as promedio_motivacion,
        AVG((respuestas->>'pregunta_12')::numeric) as promedio_interes_futuro
      FROM evaluations 
      WHERE evento_id = $1
    `;
    const result = await query(queryText, [evento_id]);
    return result.rows[0];
  }

  // Obtener respuestas abiertas de un evento
  static async getOpenResponses(evento_id) {
    const queryText = `
      SELECT 
        e.id,
        e.created_at,
        u.nombre,
        u.correo,
        respuestas->>'pregunta_13' as lo_que_mas_gusto,
        respuestas->>'pregunta_14' as aspectos_mejorar,
        respuestas->>'pregunta_15' as sugerencias
      FROM evaluations e
      JOIN users u ON e.usuario_id = u.id
      WHERE e.evento_id = $1
      ORDER BY e.created_at DESC
    `;
    const result = await query(queryText, [evento_id]);
    return result.rows;
  }

  // Actualizar evaluación
  static async update(id, respuestas, usuario_id) {
    // Verificar que la evaluación existe y pertenece al usuario
    const existingEvaluation = await Evaluation.findById(id);
    if (!existingEvaluation) {
      throw new Error('Evaluación no encontrada');
    }

    if (existingEvaluation.usuario_id !== usuario_id) {
      throw new Error('No tienes permisos para actualizar esta evaluación');
    }

    const queryText = `
      UPDATE evaluations 
      SET respuestas = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await query(queryText, [JSON.stringify(respuestas), id]);
    return new Evaluation(result.rows[0]);
  }

  // Obtener evaluación por ID
  static async findById(id) {
    const queryText = `
      SELECT * FROM evaluations WHERE id = $1
    `;
    const result = await query(queryText, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new Evaluation(result.rows[0]);
  }

  // Eliminar evaluación
  static async delete(id, usuario_id) {
    const existingEvaluation = await Evaluation.findById(id);
    if (!existingEvaluation) {
      throw new Error('Evaluación no encontrada');
    }

    if (existingEvaluation.usuario_id !== usuario_id) {
      throw new Error('No tienes permisos para eliminar esta evaluación');
    }

    const queryText = `
      DELETE FROM evaluations WHERE id = $1
    `;
    await query(queryText, [id]);
    return { id, deleted: true };
  }

  // Método para convertir a JSON
  toJSON() {
    return {
      id: this.id,
      evento_id: this.evento_id,
      usuario_id: this.usuario_id,
      respuestas: typeof this.respuestas === 'string' ? JSON.parse(this.respuestas) : this.respuestas,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Evaluation;
