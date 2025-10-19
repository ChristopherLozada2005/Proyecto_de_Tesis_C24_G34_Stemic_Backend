const { query } = require('../config/database');

class ReportDataCache {
  constructor(cacheData) {
    this.id = cacheData.id;
    this.evento_id = cacheData.evento_id;
    this.report_type = cacheData.report_type;
    this.data = cacheData.data;
    this.last_updated = cacheData.last_updated;
    this.is_stale = cacheData.is_stale;
    this.created_at = cacheData.created_at;
    this.updated_at = cacheData.updated_at;
  }

  // Obtener datos de reporte desde cache
  static async getReportData(eventoId, reportType) {
    const queryText = `
      SELECT * FROM report_data_cache 
      WHERE evento_id = $1 AND report_type = $2 AND is_stale = false
      ORDER BY last_updated DESC 
      LIMIT 1
    `;
    
    const result = await query(queryText, [eventoId, reportType]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new ReportDataCache(result.rows[0]);
  }

  // Obtener datos de reporte con fallback a tiempo real
  static async getReportDataWithFallback(eventoId, reportType, fallbackFunction) {
    // Intentar obtener desde cache primero
    const cachedData = await ReportDataCache.getReportData(eventoId, reportType);
    
    if (cachedData) {
      return {
        data: cachedData.data,
        source: 'cache',
        last_updated: cachedData.last_updated
      };
    }
    
    // Si no hay datos en cache, generar en tiempo real
    const realTimeData = await fallbackFunction(eventoId);
    
    return {
      data: realTimeData,
      source: 'realtime',
      last_updated: new Date()
    };
  }

  // Marcar datos como obsoletos
  static async markAsStale(eventoId, reportType) {
    const queryText = `
      UPDATE report_data_cache 
      SET is_stale = true, updated_at = CURRENT_TIMESTAMP
      WHERE evento_id = $1 AND report_type = $2
    `;
    
    await query(queryText, [eventoId, reportType]);
    return { evento_id: eventoId, report_type: reportType, marked_stale: true };
  }

  // Limpiar datos obsoletos
  static async cleanStaleData(daysOld = 30) {
    const queryText = `
      DELETE FROM report_data_cache 
      WHERE is_stale = true 
      AND last_updated < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
    `;
    
    const result = await query(queryText);
    return { deleted_count: result.rowCount };
  }

  // Obtener estadísticas del cache
  static async getCacheStats() {
    const queryText = `
      SELECT 
        report_type,
        COUNT(*) as total_entries,
        COUNT(CASE WHEN is_stale = false THEN 1 END) as fresh_entries,
        COUNT(CASE WHEN is_stale = true THEN 1 END) as stale_entries,
        MIN(last_updated) as oldest_entry,
        MAX(last_updated) as newest_entry
      FROM report_data_cache 
      GROUP BY report_type
    `;
    
    const result = await query(queryText);
    return result.rows;
  }

  // Forzar actualización de datos
  static async forceUpdate(eventoId, reportType) {
    // Marcar como obsoleto para forzar regeneración
    await ReportDataCache.markAsStale(eventoId, reportType);
    
    // Llamar a la función de actualización correspondiente
    if (reportType === 'participation') {
      await query('SELECT update_participation_report_data($1)', [eventoId]);
    } else if (reportType === 'satisfaction') {
      await query('SELECT update_satisfaction_report_data($1)', [eventoId]);
    }
    
    return { evento_id: eventoId, report_type: reportType, force_updated: true };
  }

  // Obtener todos los datos de un evento
  static async getEventReportData(eventoId) {
    const queryText = `
      SELECT * FROM report_data_cache 
      WHERE evento_id = $1 
      ORDER BY report_type, last_updated DESC
    `;
    
    const result = await query(queryText, [eventoId]);
    return result.rows.map(row => new ReportDataCache(row));
  }

  // Obtener datos con filtros
  static async getReportDataWithFilters(filters = {}) {
    let queryText = `
      SELECT rdc.*, e.titulo as evento_titulo
      FROM report_data_cache rdc
      JOIN eventos e ON rdc.evento_id = e.id
      WHERE 1=1
    `;
    
    const values = [];
    let paramCounter = 1;

    // Aplicar filtros
    if (filters.report_type) {
      queryText += ` AND rdc.report_type = $${paramCounter}`;
      values.push(filters.report_type);
      paramCounter++;
    }

    if (filters.evento_id) {
      queryText += ` AND rdc.evento_id = $${paramCounter}`;
      values.push(filters.evento_id);
      paramCounter++;
    }

    if (filters.is_stale !== undefined) {
      queryText += ` AND rdc.is_stale = $${paramCounter}`;
      values.push(filters.is_stale);
      paramCounter++;
    }

    if (filters.fecha_desde) {
      queryText += ` AND rdc.last_updated >= $${paramCounter}`;
      values.push(filters.fecha_desde);
      paramCounter++;
    }

    if (filters.fecha_hasta) {
      queryText += ` AND rdc.last_updated <= $${paramCounter}`;
      values.push(filters.fecha_hasta);
      paramCounter++;
    }

    // Ordenar por fecha de actualización
    queryText += ` ORDER BY rdc.last_updated DESC`;

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
    return result.rows.map(row => new ReportDataCache(row));
  }

  // Método para convertir a JSON
  toJSON() {
    return {
      id: this.id,
      evento_id: this.evento_id,
      report_type: this.report_type,
      data: typeof this.data === 'string' ? JSON.parse(this.data) : this.data,
      last_updated: this.last_updated,
      is_stale: this.is_stale,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Método para JSON con información del evento
  toJSONWithEvent() {
    return {
      id: this.id,
      evento_id: this.evento_id,
      evento_titulo: this.evento_titulo,
      report_type: this.report_type,
      data: typeof this.data === 'string' ? JSON.parse(this.data) : this.data,
      last_updated: this.last_updated,
      is_stale: this.is_stale,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = ReportDataCache;
