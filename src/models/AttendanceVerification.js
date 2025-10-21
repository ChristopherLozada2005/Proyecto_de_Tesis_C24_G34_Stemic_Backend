const { query } = require('../config/database');

class AttendanceVerification {
  constructor(data) {
    this.id = data.id;
    this.evento_id = data.evento_id;
    this.usuario_id = data.usuario_id;
    this.qr_id = data.qr_id;
    this.verified_at = data.verified_at;
    this.created_at = data.created_at;
  }

  toJSON() {
    return {
      id: this.id,
      evento_id: this.evento_id,
      usuario_id: this.usuario_id,
      qr_id: this.qr_id,
      verified_at: this.verified_at,
      created_at: this.created_at
    };
  }

  // Verificar asistencia de un usuario
  static async verifyAttendance(evento_id, usuario_id, qr_id) {
    try {
      // Verificar que el usuario está inscrito en el evento
      const inscriptionQuery = `
        SELECT i.id 
        FROM inscriptions i
        JOIN eventos e ON i.event_id = e.id
        WHERE i.user_id = $1 AND i.event_id = $2 AND e.activo = true
      `;
      
      const inscriptionResult = await query(inscriptionQuery, [usuario_id, evento_id]);
      
      if (inscriptionResult.rows.length === 0) {
        throw new Error('No estás inscrito en este evento');
      }

      // Verificar que no haya verificado asistencia previamente
      const existingVerification = await AttendanceVerification.findByUserAndEvent(usuario_id, evento_id);
      if (existingVerification) {
        throw new Error('Ya has verificado tu asistencia a este evento');
      }

      // Crear la verificación de asistencia
      const insertQuery = `
        INSERT INTO attendance_verification (evento_id, usuario_id, qr_id)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      
      const values = [evento_id, usuario_id, qr_id];
      const result = await query(insertQuery, values);
      
      return new AttendanceVerification(result.rows[0]);
      
    } catch (error) {
      throw error;
    }
  }

  // Verificar si un usuario asistió a un evento
  static async findByUserAndEvent(usuario_id, evento_id) {
    try {
      const queryText = `
        SELECT * FROM attendance_verification 
        WHERE usuario_id = $1 AND evento_id = $2
      `;
      
      const result = await query(queryText, [usuario_id, evento_id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new AttendanceVerification(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Obtener todas las verificaciones de un evento
  static async getByEvent(evento_id) {
    try {
      const queryText = `
        SELECT av.*, u.nombre, u.correo, aq.created_at as qr_created_at
        FROM attendance_verification av
        JOIN users u ON av.usuario_id = u.id
        JOIN attendance_qr aq ON av.qr_id = aq.id
        WHERE av.evento_id = $1
        ORDER BY av.verified_at DESC
      `;
      
      const result = await query(queryText, [evento_id]);
      return result.rows.map(row => ({
        id: row.id,
        evento_id: row.evento_id,
        usuario_id: row.usuario_id,
        qr_id: row.qr_id,
        verified_at: row.verified_at,
        created_at: row.created_at,
        usuario: {
          nombre: row.nombre,
          correo: row.correo
        },
        qr_created_at: row.qr_created_at
      }));
    } catch (error) {
      throw error;
    }
  }

  // Obtener estadísticas de asistencia de un evento
  static async getEventStats(evento_id) {
    try {
      const queryText = `
        SELECT 
          COUNT(i.id) as total_inscritos,
          COUNT(av.id) as total_asistentes,
          CASE 
            WHEN COUNT(i.id) > 0 THEN ROUND((COUNT(av.id)::numeric / COUNT(i.id)::numeric) * 100, 2)
            ELSE 0
          END as porcentaje_asistencia
        FROM inscriptions i
        LEFT JOIN attendance_verification av ON i.user_id = av.usuario_id AND i.event_id = av.evento_id
        WHERE i.event_id = $1
      `;
      
      const result = await query(queryText, [evento_id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Verificar si un usuario puede evaluar (asistió al evento)
  static async canUserEvaluate(usuario_id, evento_id) {
    try {
      const queryText = `
        SELECT COUNT(*) as count
        FROM attendance_verification 
        WHERE usuario_id = $1 AND evento_id = $2
      `;
      
      const result = await query(queryText, [usuario_id, evento_id]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      throw error;
    }
  }

  // Obtener verificaciones de un usuario
  static async getByUser(usuario_id) {
    try {
      const queryText = `
        SELECT av.*, e.titulo as evento_titulo, e.fecha_hora as evento_fecha
        FROM attendance_verification av
        JOIN eventos e ON av.evento_id = e.id
        WHERE av.usuario_id = $1
        ORDER BY av.verified_at DESC
      `;
      
      const result = await query(queryText, [usuario_id]);
      return result.rows.map(row => ({
        id: row.id,
        evento_id: row.evento_id,
        usuario_id: row.usuario_id,
        qr_id: row.qr_id,
        verified_at: row.verified_at,
        created_at: row.created_at,
        evento: {
          titulo: row.evento_titulo,
          fecha_hora: row.evento_fecha
        }
      }));
    } catch (error) {
      throw error;
    }
  }
}

module.exports = AttendanceVerification;
