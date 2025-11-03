const { query } = require('../config/database');

class EventPostulation {
  constructor(data) {
    this.id = data.id;
    this.event_id = data.event_id;
    this.user_id = data.user_id;
    this.schema_snapshot = data.schema_snapshot;
    this.responses = data.responses;
    this.estado = data.estado;
    this.comentarios_revision = data.comentarios_revision;
    this.revisado_por = data.revisado_por;
    this.fecha_postulacion = data.fecha_postulacion;
    this.fecha_revision = data.fecha_revision;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.usuario_nombre = data.usuario_nombre;
    this.usuario_correo = data.usuario_correo;
    this.revisor_nombre = data.revisor_nombre;
    this.revisor_correo = data.revisor_correo;
  }

  toJSON() {
    return {
      id: this.id,
      event_id: this.event_id,
      user_id: this.user_id,
      schema_snapshot: this.schema_snapshot,
      responses: this.responses,
      estado: this.estado,
      comentarios_revision: this.comentarios_revision,
      revisado_por: this.revisado_por,
      fecha_postulacion: this.fecha_postulacion,
      fecha_revision: this.fecha_revision,
      created_at: this.created_at,
      updated_at: this.updated_at,
      usuario: this.usuario_nombre ? {
        nombre: this.usuario_nombre,
        correo: this.usuario_correo
      } : undefined,
      revisor: this.revisado_por ? {
        nombre: this.revisor_nombre,
        correo: this.revisor_correo
      } : undefined
    };
  }

  static async submit({ eventId, userId, schemaSnapshot, responses }) {
    try {
      const insertQuery = `
        INSERT INTO event_postulations (event_id, user_id, schema_snapshot, responses)
        VALUES ($1, $2, $3::jsonb, $4::jsonb)
        RETURNING *
      `;

      const result = await query(insertQuery, [eventId, userId, schemaSnapshot, responses]);
      return new EventPostulation(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        const duplicationMessage = 'Ya registraste una postulación para este evento. Puedes actualizarla contactando al organizador.';
        throw new Error(duplicationMessage);
      }
      throw error;
    }
  }

  static async findByEvent(eventId, filters = {}, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const conditions = ['ep.event_id = $1'];
    const values = [eventId];
    let paramIndex = 2;

    if (filters.estado) {
      conditions.push(`ep.estado = $${paramIndex}`);
      values.push(filters.estado);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(
        u.nombre ILIKE $${paramIndex} OR
        u.correo ILIKE $${paramIndex} OR
        CAST(ep.responses AS TEXT) ILIKE $${paramIndex}
      )`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const queryText = `
      SELECT ep.*, u.nombre AS usuario_nombre, u.correo AS usuario_correo,
             r.nombre AS revisor_nombre, r.correo AS revisor_correo
      FROM event_postulations ep
      INNER JOIN users u ON ep.user_id = u.id
      LEFT JOIN users r ON ep.revisado_por = r.id
      ${whereClause}
      ORDER BY ep.fecha_postulacion DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);

    const result = await query(queryText, values);

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM event_postulations ep
      INNER JOIN users u ON ep.user_id = u.id
      ${whereClause}
    `;

    const countResult = await query(countQuery, values.slice(0, paramIndex - 1));
    const total = parseInt(countResult.rows[0].total, 10);

    return {
      postulations: result.rows.map(row => new EventPostulation(row).toJSON()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async findById(id) {
    const queryText = `
      SELECT ep.*, u.nombre AS usuario_nombre, u.correo AS usuario_correo,
             r.nombre AS revisor_nombre, r.correo AS revisor_correo,
             e.titulo AS event_title
      FROM event_postulations ep
      INNER JOIN users u ON ep.user_id = u.id
      INNER JOIN eventos e ON ep.event_id = e.id
      LEFT JOIN users r ON ep.revisado_por = r.id
      WHERE ep.id = $1
    `;

    const result = await query(queryText, [id]);
    if (result.rows.length === 0) {
      return null;
    }

    return new EventPostulation(result.rows[0]);
  }

  static async getUserPostulationForEvent(eventId, userId) {
    const queryText = `
      SELECT ep.*, u.nombre AS usuario_nombre, u.correo AS usuario_correo,
             r.nombre AS revisor_nombre, r.correo AS revisor_correo
      FROM event_postulations ep
      INNER JOIN users u ON ep.user_id = u.id
      LEFT JOIN users r ON ep.revisado_por = r.id
      WHERE ep.event_id = $1 AND ep.user_id = $2
    `;

    const result = await query(queryText, [eventId, userId]);
    if (result.rows.length === 0) {
      return null;
    }

    return new EventPostulation(result.rows[0]);
  }

  static async updateStatus(id, reviewerId, estado, comentarios = null) {
    const validStatuses = ['pendiente', 'en_revision', 'preseleccionado', 'aprobado', 'rechazado'];
    if (!validStatuses.includes(estado)) {
      throw new Error('Estado de postulación inválido');
    }

    const queryText = `
      UPDATE event_postulations
      SET estado = $1,
          comentarios_revision = $2,
          revisado_por = $3,
          fecha_revision = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const result = await query(queryText, [estado, comentarios, reviewerId, id]);
    if (result.rows.length === 0) {
      throw new Error('Postulación del evento no encontrada');
    }

    return new EventPostulation(result.rows[0]);
  }

  static async upsertForUser({ eventId, userId, schemaSnapshot, responses }) {
    const queryText = `
      INSERT INTO event_postulations (event_id, user_id, schema_snapshot, responses)
      VALUES ($1, $2, $3::jsonb, $4::jsonb)
      ON CONFLICT (event_id, user_id)
      DO UPDATE SET
        schema_snapshot = EXCLUDED.schema_snapshot,
        responses = EXCLUDED.responses,
        estado = 'pendiente',
        comentarios_revision = NULL,
        revisado_por = NULL,
        fecha_postulacion = CURRENT_TIMESTAMP,
        fecha_revision = NULL,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await query(queryText, [eventId, userId, schemaSnapshot, responses]);
    return new EventPostulation(result.rows[0]);
  }

  static async getStats(eventId) {
    const queryText = `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes,
        COUNT(*) FILTER (WHERE estado = 'en_revision') AS en_revision,
        COUNT(*) FILTER (WHERE estado = 'preseleccionado') AS preseleccionados,
        COUNT(*) FILTER (WHERE estado = 'aprobado') AS aprobados,
        COUNT(*) FILTER (WHERE estado = 'rechazado') AS rechazados
      FROM event_postulations
      WHERE event_id = $1
    `;

    const result = await query(queryText, [eventId]);
    return result.rows[0];
  }
}

module.exports = EventPostulation;
