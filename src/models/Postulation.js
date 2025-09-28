const { query } = require('../config/database');

class Postulation {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.carrera_especialidad = data.carrera_especialidad;
    this.motivacion = data.motivacion;
    this.estado = data.estado;
    this.fecha_postulacion = data.fecha_postulacion;
    this.fecha_revision = data.fecha_revision;
    this.revisado_por = data.revisado_por;
    this.comentarios_revision = data.comentarios_revision;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      carrera_especialidad: this.carrera_especialidad,
      motivacion: this.motivacion,
      estado: this.estado,
      fecha_postulacion: this.fecha_postulacion,
      fecha_revision: this.fecha_revision,
      revisado_por: this.revisado_por,
      comentarios_revision: this.comentarios_revision,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Crear nueva postulación
  static async create(userId, postulationData) {
    try {
      const { carrera_especialidad, motivacion } = postulationData;

      // Verificar que el usuario no haya postulado antes
      const existingPostulation = await Postulation.findByUserId(userId);
      if (existingPostulation) {
        throw new Error('Ya has postulado anteriormente a LEAD at TECSUP');
      }

      const insertQuery = `
        INSERT INTO postulations (user_id, carrera_especialidad, motivacion)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      
      const result = await query(insertQuery, [userId, carrera_especialidad, motivacion]);
      return new Postulation(result.rows[0]);
      
    } catch (error) {
      if (error.code === '23505') { // Violación de restricción única
        throw new Error('Ya has postulado anteriormente a LEAD at TECSUP');
      }
      throw error;
    }
  }

  // Buscar postulación por ID
  static async findById(id) {
    try {
      const queryText = `
        SELECT p.*, u.nombre as usuario_nombre, u.correo as usuario_correo,
               r.nombre as revisor_nombre, r.correo as revisor_correo
        FROM postulations p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN users r ON p.revisado_por = r.id
        WHERE p.id = $1
      `;
      const result = await query(queryText, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  // Buscar postulación por usuario
  static async findByUserId(userId) {
    try {
      const queryText = `
        SELECT p.*, u.nombre as usuario_nombre, u.correo as usuario_correo,
               r.nombre as revisor_nombre, r.correo as revisor_correo
        FROM postulations p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN users r ON p.revisado_por = r.id
        WHERE p.user_id = $1
      `;
      const result = await query(queryText, [userId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  // Obtener todas las postulaciones (para admins)
  static async findAll(filters = {}, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      let whereClause = 'WHERE 1=1';
      const queryParams = [];
      let paramCount = 0;

      // Filtros
      if (filters.estado) {
        paramCount++;
        whereClause += ` AND p.estado = $${paramCount}`;
        queryParams.push(filters.estado);
      }

      if (filters.carrera_especialidad) {
        paramCount++;
        whereClause += ` AND p.carrera_especialidad ILIKE $${paramCount}`;
        queryParams.push(`%${filters.carrera_especialidad}%`);
      }

      if (filters.fecha_desde) {
        paramCount++;
        whereClause += ` AND p.fecha_postulacion >= $${paramCount}`;
        queryParams.push(filters.fecha_desde);
      }

      if (filters.fecha_hasta) {
        paramCount++;
        whereClause += ` AND p.fecha_postulacion <= $${paramCount}`;
        queryParams.push(filters.fecha_hasta);
      }

      // Consulta principal
      const queryText = `
        SELECT p.*, u.nombre as usuario_nombre, u.correo as usuario_correo,
               r.nombre as revisor_nombre, r.correo as revisor_correo
        FROM postulations p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN users r ON p.revisado_por = r.id
        ${whereClause}
        ORDER BY p.fecha_postulacion DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;
      
      queryParams.push(limit, offset);
      const result = await query(queryText, queryParams);
      
      // Contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM postulations p
        ${whereClause}
      `;
      const countResult = await query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);
      
      return {
        postulations: result.rows.map(row => ({
          id: row.id,
          user_id: row.user_id,
          carrera_especialidad: row.carrera_especialidad,
          motivacion: row.motivacion,
          estado: row.estado,
          fecha_postulacion: row.fecha_postulacion,
          fecha_revision: row.fecha_revision,
          revisado_por: row.revisado_por,
          comentarios_revision: row.comentarios_revision,
          created_at: row.created_at,
          updated_at: row.updated_at,
          usuario: {
            id: row.user_id,
            nombre: row.usuario_nombre,
            correo: row.usuario_correo
          },
          revisor: row.revisado_por ? {
            id: row.revisado_por,
            nombre: row.revisor_nombre,
            correo: row.revisor_correo
          } : null
        })),
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

  // Actualizar estado de postulación (solo admins)
  static async updateStatus(id, adminId, status, comentarios = null) {
    try {
      const validStatuses = ['pendiente', 'aprobada', 'rechazada'];
      if (!validStatuses.includes(status)) {
        throw new Error('Estado inválido. Estados válidos: pendiente, aprobada, rechazada');
      }

      // Obtener información de la postulación antes de actualizar
      const postulationQuery = `
        SELECT p.*, u.rol as usuario_rol
        FROM postulations p
        INNER JOIN users u ON p.user_id = u.id
        WHERE p.id = $1
      `;
      const postulationResult = await query(postulationQuery, [id]);
      
      if (postulationResult.rows.length === 0) {
        throw new Error('Postulación no encontrada');
      }
      
      const postulation = postulationResult.rows[0];
      const userId = postulation.user_id;

      // Actualizar estado de la postulación
      const updateQuery = `
        UPDATE postulations 
        SET estado = $1, 
            fecha_revision = CURRENT_TIMESTAMP,
            revisado_por = $2,
            comentarios_revision = $3
        WHERE id = $4
        RETURNING *
      `;
      
      const result = await query(updateQuery, [status, adminId, comentarios, id]);
      
      // Si se aprueba la postulación, cambiar el rol del usuario a 'organizador'
      if (status === 'aprobada') {
        const updateUserRoleQuery = `
          UPDATE users 
          SET rol = 'organizador', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND rol = 'usuario'
        `;
        
        await query(updateUserRoleQuery, [userId]);
        
        console.log(`✅ Rol del usuario ${userId} cambiado a 'organizador' tras aprobar postulación ${id}`);
      }
      
      return new Postulation(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Obtener estadísticas de postulaciones
  static async getStats() {
    try {
      const queryText = `
        SELECT 
          COUNT(*) as total_postulaciones,
          COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
          COUNT(CASE WHEN estado = 'aprobadas' THEN 1 END) as aprobadas,
          COUNT(CASE WHEN estado = 'rechazadas' THEN 1 END) as rechazadas,
          MIN(fecha_postulacion) as primera_postulacion,
          MAX(fecha_postulacion) as ultima_postulacion
        FROM postulations
      `;
      
      const result = await query(queryText);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Obtener estadísticas por carrera
  static async getStatsByCareer() {
    try {
      const queryText = `
        SELECT 
          carrera_especialidad,
          COUNT(*) as total,
          COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
          COUNT(CASE WHEN estado = 'aprobadas' THEN 1 END) as aprobadas,
          COUNT(CASE WHEN estado = 'rechazadas' THEN 1 END) as rechazadas
        FROM postulations
        GROUP BY carrera_especialidad
        ORDER BY total DESC
      `;
      
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Eliminar postulación (solo si está pendiente)
  static async delete(id, userId) {
    try {
      const queryText = `
        DELETE FROM postulations 
        WHERE id = $1 AND user_id = $2 AND estado = 'pendiente'
        RETURNING id
      `;
      const result = await query(queryText, [id, userId]);
      
      if (result.rows.length === 0) {
        throw new Error('No se puede eliminar la postulación. Solo se pueden eliminar postulaciones pendientes propias');
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Verificar rol del usuario después de aprobación
  static async getUserRoleAfterApproval(postulationId) {
    try {
      const queryText = `
        SELECT u.id, u.nombre, u.correo, u.rol
        FROM postulations p
        INNER JOIN users u ON p.user_id = u.id
        WHERE p.id = $1 AND p.estado = 'aprobada'
      `;
      const result = await query(queryText, [postulationId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Postulation;
