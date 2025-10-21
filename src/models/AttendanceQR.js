const { query } = require('../config/database');
const QRCode = require('qrcode');

class AttendanceQR {
  constructor(data) {
    this.id = data.id;
    this.evento_id = data.evento_id;
    this.qr_code = data.qr_code;
    this.qr_data = data.qr_data;
    this.activo = data.activo;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      evento_id: this.evento_id,
      qr_code: this.qr_code,
      qr_data: this.qr_data,
      activo: this.activo,
      created_by: this.created_by,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Generar QR dinámicamente cuando se necesite
  async generateQRCode() {
    try {
      const qrData = typeof this.qr_data === 'string' ? JSON.parse(this.qr_data) : this.qr_data;
      
      const qrCode = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.9,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 300
      });
      
      return qrCode;
    } catch (error) {
      throw new Error('Error al generar código QR: ' + error.message);
    }
  }

  // Crear un nuevo QR de asistencia
  static async create(evento_id, created_by) {
    try {
      // Verificar que el evento existe y está activo
      const eventQuery = `
        SELECT id, titulo, fecha_hora, activo 
        FROM eventos 
        WHERE id = $1 AND activo = true
      `;
      const eventResult = await query(eventQuery, [evento_id]);
      
      if (eventResult.rows.length === 0) {
        throw new Error('El evento no existe o no está disponible');
      }

      const event = eventResult.rows[0];

      // Desactivar cualquier QR existente para este evento
      await query(
        'UPDATE attendance_qr SET activo = false WHERE evento_id = $1',
        [evento_id]
      );

      // Generar datos únicos para el QR
      const qrData = {
        evento_id: evento_id,
        evento_titulo: event.titulo,
        timestamp: new Date().toISOString(),
        type: 'attendance_verification'
      };

      // Generar un ID único para el QR (más eficiente que almacenar el QR completo)
      const qrId = require('crypto').randomUUID();
      const qrDataWithId = {
        ...qrData,
        qr_id: qrId
      };

      // Insertar el nuevo QR (solo almacenamos los datos, no el QR completo)
      const insertQuery = `
        INSERT INTO attendance_qr (evento_id, qr_code, qr_data, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const values = [
        evento_id,
        qrId, // Usamos el ID como código QR
        JSON.stringify(qrDataWithId),
        created_by
      ];

      const result = await query(insertQuery, values);
      return new AttendanceQR(result.rows[0]);
      
    } catch (error) {
      throw error;
    }
  }

  // Obtener QR activo de un evento
  static async getActiveByEvent(evento_id) {
    try {
      const queryText = `
        SELECT * FROM attendance_qr 
        WHERE evento_id = $1 AND activo = true
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const result = await query(queryText, [evento_id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return new AttendanceQR(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Verificar si existe un QR activo para un evento
  static async hasActiveQR(evento_id) {
    try {
      const queryText = `
        SELECT COUNT(*) as count 
        FROM attendance_qr 
        WHERE evento_id = $1 AND activo = true
      `;
      
      const result = await query(queryText, [evento_id]);
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      throw error;
    }
  }

  // Desactivar QR de un evento
  static async deactivateByEvent(evento_id) {
    try {
      const updateQuery = `
        UPDATE attendance_qr 
        SET activo = false, updated_at = CURRENT_TIMESTAMP
        WHERE evento_id = $1 AND activo = true
        RETURNING *
      `;
      
      const result = await query(updateQuery, [evento_id]);
      return result.rows.length > 0;
    } catch (error) {
      throw error;
    }
  }

  // Obtener todos los QR de un evento (historial)
  static async getByEvent(evento_id) {
    try {
      const queryText = `
        SELECT aq.*, u.nombre as created_by_name
        FROM attendance_qr aq
        JOIN users u ON aq.created_by = u.id
        WHERE aq.evento_id = $1
        ORDER BY aq.created_at DESC
      `;
      
      const result = await query(queryText, [evento_id]);
      return result.rows.map(row => new AttendanceQR(row));
    } catch (error) {
      throw error;
    }
  }

  // Validar QR y obtener datos
  static async validateQR(qrDataString) {
    try {
      const qrData = JSON.parse(qrDataString);
      
      // Verificar que el QR es válido y está activo
      const queryText = `
        SELECT aq.*, e.titulo, e.fecha_hora, e.activo as evento_activo
        FROM attendance_qr aq
        JOIN eventos e ON aq.evento_id = e.id
        WHERE aq.evento_id = $1 
          AND aq.activo = true 
          AND aq.qr_code = $2
      `;
      
      const result = await query(queryText, [qrData.evento_id, qrData.qr_id]);
      
      if (result.rows.length === 0) {
        throw new Error('QR inválido o inactivo');
      }
      
      const qrRecord = result.rows[0];
      
      // Verificar que el evento sigue activo
      if (!qrRecord.evento_activo) {
        throw new Error('El evento ya no está activo');
      }
      
      return {
        valid: true,
        evento_id: qrRecord.evento_id,
        evento_titulo: qrRecord.titulo,
        evento_fecha: qrRecord.fecha_hora,
        qr_id: qrRecord.id
      };
    } catch (error) {
      throw new Error('QR inválido: ' + error.message);
    }
  }
}

module.exports = AttendanceQR;
