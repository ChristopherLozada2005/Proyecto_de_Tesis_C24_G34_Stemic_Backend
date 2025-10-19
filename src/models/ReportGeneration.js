const { query } = require('../config/database');

class ReportGeneration {
  constructor(reportData) {
    this.id = reportData.id;
    this.user_id = reportData.user_id;
    this.report_type = reportData.report_type;
    this.report_format = reportData.report_format;
    this.filters = reportData.filters;
    this.file_name = reportData.file_name;
    this.file_size = reportData.file_size;
    this.generation_time_ms = reportData.generation_time_ms;
    this.status = reportData.status;
    this.error_message = reportData.error_message;
    this.created_at = reportData.created_at;
    this.updated_at = reportData.updated_at;
  }

  // Crear un nuevo registro de generación de reporte
  static async create(reportData) {
    const {
      user_id,
      report_type,
      report_format,
      filters = {},
      file_name,
      file_size = null,
      generation_time_ms = null,
      status = 'completed',
      error_message = null
    } = reportData;

    const queryText = `
      INSERT INTO report_generations (
        user_id, report_type, report_format, filters, file_name, 
        file_size, generation_time_ms, status, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      user_id,
      report_type,
      report_format,
      JSON.stringify(filters),
      file_name,
      file_size,
      generation_time_ms,
      status,
      error_message
    ];

    const result = await query(queryText, values);
    return new ReportGeneration(result.rows[0]);
  }

  // Obtener generaciones de reportes por usuario
  static async findByUser(userId, filters = {}) {
    let queryText = `
      SELECT rg.*, u.nombre as user_name, u.correo as user_email
      FROM report_generations rg
      JOIN users u ON rg.user_id = u.id
      WHERE rg.user_id = $1
    `;
    
    const values = [userId];
    let paramCounter = 2;

    // Aplicar filtros
    if (filters.report_type) {
      queryText += ` AND rg.report_type = $${paramCounter}`;
      values.push(filters.report_type);
      paramCounter++;
    }

    if (filters.report_format) {
      queryText += ` AND rg.report_format = $${paramCounter}`;
      values.push(filters.report_format);
      paramCounter++;
    }

    if (filters.status) {
      queryText += ` AND rg.status = $${paramCounter}`;
      values.push(filters.status);
      paramCounter++;
    }

    if (filters.fecha_desde) {
      queryText += ` AND rg.created_at >= $${paramCounter}`;
      values.push(filters.fecha_desde);
      paramCounter++;
    }

    if (filters.fecha_hasta) {
      queryText += ` AND rg.created_at <= $${paramCounter}`;
      values.push(filters.fecha_hasta);
      paramCounter++;
    }

    // Ordenar por fecha de creación (más recientes primero)
    queryText += ` ORDER BY rg.created_at DESC`;

    // Paginación
    if (filters.limit) {
      queryText += ` LIMIT $${paramCounter}`;
      values.push(filters.limit);
      paramCounter++;
    }

    if (filters.offset) {
      queryText += ` OFFSET $${paramCounter}`;
      values.push(filters.offset);
    }

    const result = await query(queryText, values);
    return result.rows.map(row => new ReportGeneration(row));
  }

  // Obtener todas las generaciones de reportes (para admins)
  static async findAll(filters = {}) {
    let queryText = `
      SELECT rg.*, u.nombre as user_name, u.correo as user_email
      FROM report_generations rg
      JOIN users u ON rg.user_id = u.id
      WHERE 1=1
    `;
    
    const values = [];
    let paramCounter = 1;

    // Aplicar filtros
    if (filters.user_id) {
      queryText += ` AND rg.user_id = $${paramCounter}`;
      values.push(filters.user_id);
      paramCounter++;
    }

    if (filters.report_type) {
      queryText += ` AND rg.report_type = $${paramCounter}`;
      values.push(filters.report_type);
      paramCounter++;
    }

    if (filters.report_format) {
      queryText += ` AND rg.report_format = $${paramCounter}`;
      values.push(filters.report_format);
      paramCounter++;
    }

    if (filters.status) {
      queryText += ` AND rg.status = $${paramCounter}`;
      values.push(filters.status);
      paramCounter++;
    }

    if (filters.fecha_desde) {
      queryText += ` AND rg.created_at >= $${paramCounter}`;
      values.push(filters.fecha_desde);
      paramCounter++;
    }

    if (filters.fecha_hasta) {
      queryText += ` AND rg.created_at <= $${paramCounter}`;
      values.push(filters.fecha_hasta);
      paramCounter++;
    }

    // Ordenar por fecha de creación (más recientes primero)
    queryText += ` ORDER BY rg.created_at DESC`;

    // Paginación
    if (filters.limit) {
      queryText += ` LIMIT $${paramCounter}`;
      values.push(filters.limit);
      paramCounter++;
    }

    if (filters.offset) {
      queryText += ` OFFSET $${paramCounter}`;
      values.push(filters.offset);
    }

    const result = await query(queryText, values);
    return result.rows.map(row => new ReportGeneration(row));
  }

  // Obtener estadísticas de generaciones de reportes
  static async getStats(filters = {}) {
    let queryText = `
      SELECT 
        COUNT(*) as total_generations,
        COUNT(CASE WHEN report_type = 'participation' THEN 1 END) as participation_reports,
        COUNT(CASE WHEN report_type = 'satisfaction' THEN 1 END) as satisfaction_reports,
        COUNT(CASE WHEN report_format = 'excel' THEN 1 END) as excel_reports,
        COUNT(CASE WHEN report_format = 'pdf' THEN 1 END) as pdf_reports,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_reports,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_reports,
        AVG(generation_time_ms) as avg_generation_time_ms,
        SUM(file_size) as total_file_size_bytes
      FROM report_generations
      WHERE 1=1
    `;
    
    const values = [];
    let paramCounter = 1;

    // Aplicar filtros
    if (filters.user_id) {
      queryText += ` AND user_id = $${paramCounter}`;
      values.push(filters.user_id);
      paramCounter++;
    }

    if (filters.fecha_desde) {
      queryText += ` AND created_at >= $${paramCounter}`;
      values.push(filters.fecha_desde);
      paramCounter++;
    }

    if (filters.fecha_hasta) {
      queryText += ` AND created_at <= $${paramCounter}`;
      values.push(filters.fecha_hasta);
      paramCounter++;
    }

    const result = await query(queryText, values);
    return result.rows[0];
  }

  // Obtener generación por ID
  static async findById(id) {
    const queryText = `
      SELECT rg.*, u.nombre as user_name, u.correo as user_email
      FROM report_generations rg
      JOIN users u ON rg.user_id = u.id
      WHERE rg.id = $1
    `;
    
    const result = await query(queryText, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new ReportGeneration(result.rows[0]);
  }

  // Actualizar estado de generación
  static async updateStatus(id, status, errorMessage = null) {
    const queryText = `
      UPDATE report_generations 
      SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await query(queryText, [status, errorMessage, id]);
    
    if (result.rows.length === 0) {
      throw new Error('Generación de reporte no encontrada');
    }
    
    return new ReportGeneration(result.rows[0]);
  }

  // Actualizar métricas de generación
  static async updateMetrics(id, fileSize, generationTimeMs) {
    const queryText = `
      UPDATE report_generations 
      SET file_size = $1, generation_time_ms = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await query(queryText, [fileSize, generationTimeMs, id]);
    
    if (result.rows.length === 0) {
      throw new Error('Generación de reporte no encontrada');
    }
    
    return new ReportGeneration(result.rows[0]);
  }

  // Eliminar generación de reporte
  static async delete(id) {
    const queryText = `DELETE FROM report_generations WHERE id = $1`;
    await query(queryText, [id]);
    return { id, deleted: true };
  }

  // Método para convertir a JSON
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      report_type: this.report_type,
      report_format: this.report_format,
      filters: typeof this.filters === 'string' ? JSON.parse(this.filters) : this.filters,
      file_name: this.file_name,
      file_size: this.file_size,
      generation_time_ms: this.generation_time_ms,
      status: this.status,
      error_message: this.error_message,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Método para JSON con información del usuario
  toJSONWithUser() {
    return {
      id: this.id,
      user_id: this.user_id,
      user_name: this.user_name,
      user_email: this.user_email,
      report_type: this.report_type,
      report_format: this.report_format,
      filters: typeof this.filters === 'string' ? JSON.parse(this.filters) : this.filters,
      file_name: this.file_name,
      file_size: this.file_size,
      generation_time_ms: this.generation_time_ms,
      status: this.status,
      error_message: this.error_message,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = ReportGeneration;
