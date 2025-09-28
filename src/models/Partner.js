const { query } = require('../config/database');

class Partner {
  constructor(data) {
    this.id = data.id;
    this.nombre = data.nombre;
    this.descripcion = data.descripcion;
    this.logo_url = data.logo_url;
    this.sitio_web = data.sitio_web;
    this.activo = data.activo;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      descripcion: this.descripcion,
      logo_url: this.logo_url,
      sitio_web: this.sitio_web,
      activo: this.activo,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Crear nueva alianza
  static async create(partnerData) {
    try {
      const { nombre, descripcion, logo_url, sitio_web, activo = true } = partnerData;

      const insertQuery = `
        INSERT INTO partners (nombre, descripcion, logo_url, sitio_web, activo)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const result = await query(insertQuery, [nombre, descripcion, logo_url, sitio_web, activo]);
      return new Partner(result.rows[0]);
      
    } catch (error) {
      if (error.code === '23505') { // Violación de restricción única
        throw new Error('Ya existe una alianza con ese nombre');
      }
      throw error;
    }
  }

  // Buscar alianza por ID
  static async findById(id) {
    try {
      const queryText = `
        SELECT * FROM partners WHERE id = $1
      `;
      const result = await query(queryText, [id]);
      return result.rows.length > 0 ? new Partner(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  // Obtener todas las alianzas con filtros
  static async findAll(filters = {}, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      const queryParams = [];
      let paramCount = 0;

      // Filtros
      // Por defecto, mostrar solo alianzas activas si no se especifica lo contrario
      if (filters.activo !== undefined) {
        paramCount++;
        whereClause += ` AND activo = $${paramCount}`;
        queryParams.push(filters.activo);
      } else {
        // Si no se especifica el filtro activo, mostrar solo activas por defecto
        paramCount++;
        whereClause += ` AND activo = $${paramCount}`;
        queryParams.push(true);
      }

      if (filters.nombre) {
        paramCount++;
        whereClause += ` AND nombre ILIKE $${paramCount}`;
        queryParams.push(`%${filters.nombre}%`);
      }

      if (filters.descripcion) {
        paramCount++;
        whereClause += ` AND descripcion ILIKE $${paramCount}`;
        queryParams.push(`%${filters.descripcion}%`);
      }

      if (filters.fecha_desde) {
        paramCount++;
        whereClause += ` AND created_at >= $${paramCount}`;
        queryParams.push(filters.fecha_desde);
      }

      if (filters.fecha_hasta) {
        paramCount++;
        whereClause += ` AND created_at <= $${paramCount}`;
        queryParams.push(filters.fecha_hasta);
      }

      // Consulta principal
      const queryText = `
        SELECT * FROM partners
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      queryParams.push(limit, offset);
      const result = await query(queryText, queryParams);
      
      // Contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM partners
        ${whereClause}
      `;
      const countResult = await query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);
      
      return {
        partners: result.rows.map(row => new Partner(row)),
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

  // Obtener solo alianzas activas (para frontend público)
  static async findActive() {
    try {
      const queryText = `
        SELECT * FROM partners 
        WHERE activo = true 
        ORDER BY nombre ASC
      `;
      const result = await query(queryText);
      return result.rows.map(row => new Partner(row));
    } catch (error) {
      throw error;
    }
  }

  // Obtener todas las alianzas (incluyendo inactivas) para admins
  static async findAllForAdmin(filters = {}, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      const queryParams = [];
      let paramCount = 0;

      // Filtros (sin filtro por defecto de activo)
      if (filters.activo !== undefined) {
        paramCount++;
        whereClause += ` AND activo = $${paramCount}`;
        queryParams.push(filters.activo);
      }

      if (filters.nombre) {
        paramCount++;
        whereClause += ` AND nombre ILIKE $${paramCount}`;
        queryParams.push(`%${filters.nombre}%`);
      }

      if (filters.descripcion) {
        paramCount++;
        whereClause += ` AND descripcion ILIKE $${paramCount}`;
        queryParams.push(`%${filters.descripcion}%`);
      }

      if (filters.fecha_desde) {
        paramCount++;
        whereClause += ` AND created_at >= $${paramCount}`;
        queryParams.push(filters.fecha_desde);
      }

      if (filters.fecha_hasta) {
        paramCount++;
        whereClause += ` AND created_at <= $${paramCount}`;
        queryParams.push(filters.fecha_hasta);
      }

      // Consulta principal
      const queryText = `
        SELECT * FROM partners
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      queryParams.push(limit, offset);
      const result = await query(queryText, queryParams);
      
      // Contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM partners
        ${whereClause}
      `;
      const countResult = await query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);
      
      return {
        partners: result.rows.map(row => new Partner(row)),
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

  // Actualizar alianza
  static async update(id, partnerData) {
    try {
      const { nombre, descripcion, logo_url, sitio_web, activo } = partnerData;
      
      // Construir query dinámicamente basado en los campos proporcionados
      const updateFields = [];
      const values = [];
      let paramCount = 0;

      if (nombre !== undefined) {
        paramCount++;
        updateFields.push(`nombre = $${paramCount}`);
        values.push(nombre);
      }

      if (descripcion !== undefined) {
        paramCount++;
        updateFields.push(`descripcion = $${paramCount}`);
        values.push(descripcion);
      }

      if (logo_url !== undefined) {
        paramCount++;
        updateFields.push(`logo_url = $${paramCount}`);
        values.push(logo_url);
      }

      if (sitio_web !== undefined) {
        paramCount++;
        updateFields.push(`sitio_web = $${paramCount}`);
        values.push(sitio_web);
      }

      if (activo !== undefined) {
        paramCount++;
        updateFields.push(`activo = $${paramCount}`);
        values.push(activo);
      }

      if (updateFields.length === 0) {
        throw new Error('No hay campos para actualizar');
      }

      paramCount++;
      values.push(id);

      const updateQuery = `
        UPDATE partners 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await query(updateQuery, values);
      
      if (result.rows.length === 0) {
        throw new Error('Alianza no encontrada');
      }
      
      return new Partner(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Desactivar alianza (soft delete)
  static async deactivate(id) {
    try {
      const queryText = `
        UPDATE partners 
        SET activo = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const result = await query(queryText, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Alianza no encontrada');
      }
      
      return new Partner(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Activar alianza
  static async activate(id) {
    try {
      const queryText = `
        UPDATE partners 
        SET activo = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const result = await query(queryText, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Alianza no encontrada');
      }
      
      return new Partner(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Eliminar alianza permanentemente (hard delete)
  static async delete(id) {
    try {
      const queryText = `
        DELETE FROM partners 
        WHERE id = $1
        RETURNING id, nombre
      `;
      const result = await query(queryText, [id]);
      
      if (result.rows.length === 0) {
        throw new Error('Alianza no encontrada');
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Obtener estadísticas de alianzas
  static async getStats() {
    try {
      const queryText = `
        SELECT 
          COUNT(*) as total_alianzas,
          COUNT(CASE WHEN activo = true THEN 1 END) as alianzas_activas,
          COUNT(CASE WHEN activo = false THEN 1 END) as alianzas_inactivas,
          MIN(created_at) as primera_alianza,
          MAX(created_at) as ultima_alianza
        FROM partners
      `;
      
      const result = await query(queryText);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Buscar alianzas por nombre (para autocompletado)
  static async searchByName(searchTerm, limit = 10) {
    try {
      const queryText = `
        SELECT id, nombre, logo_url, activo
        FROM partners 
        WHERE nombre ILIKE $1
        ORDER BY nombre ASC
        LIMIT $2
      `;
      const result = await query(queryText, [`%${searchTerm}%`, limit]);
      return result.rows.map(row => ({
        id: row.id,
        nombre: row.nombre,
        logo_url: row.logo_url,
        activo: row.activo
      }));
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Partner;
