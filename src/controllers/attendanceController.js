const AttendanceQR = require('../models/AttendanceQR');
const AttendanceVerification = require('../models/AttendanceVerification');
const Event = require('../models/Event');

class AttendanceController {
  // Generar QR de asistencia para un evento
  static async generateQR(req, res) {
    try {
      const { evento_id } = req.body;
      const created_by = req.user.id;

      // Validar que se proporcione el evento_id
      if (!evento_id) {
        return res.status(400).json({
          success: false,
          message: 'evento_id es requerido'
        });
      }

      // Verificar que el evento existe
      const evento = await Event.findById(evento_id);
      if (!evento) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        });
      }

      // Generar el QR
      const qr = await AttendanceQR.create(evento_id, created_by);
      
      // Generar el código QR dinámicamente
      const qrCodeImage = await qr.generateQRCode();

      res.status(201).json({
        success: true,
        message: 'QR de asistencia generado exitosamente',
        data: {
          ...qr.toJSON(),
          qr_code_image: qrCodeImage // Incluir la imagen del QR
        }
      });

    } catch (error) {
      console.error('Error al generar QR:', error);
      
      if (error.message === 'El evento no existe o no está disponible') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener QR activo de un evento
  static async getActiveQR(req, res) {
    try {
      const { evento_id } = req.params;

      const qr = await AttendanceQR.getActiveByEvent(evento_id);
      
      if (!qr) {
        return res.status(404).json({
          success: false,
          message: 'No hay QR activo para este evento'
        });
      }

      // Generar el código QR dinámicamente
      const qrCodeImage = await qr.generateQRCode();

      res.json({
        success: true,
        data: {
          ...qr.toJSON(),
          qr_code_image: qrCodeImage // Incluir la imagen del QR
        }
      });

    } catch (error) {
      console.error('Error al obtener QR:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Verificar asistencia mediante QR
  static async verifyAttendance(req, res) {
    try {
      const { qr_data } = req.body;
      const usuario_id = req.user.id;

      // Validar que se proporcione el QR
      if (!qr_data) {
        return res.status(400).json({
          success: false,
          message: 'qr_data es requerido'
        });
      }

      // Validar el QR
      const qrValidation = await AttendanceQR.validateQR(qr_data);
      
      if (!qrValidation.valid) {
        return res.status(400).json({
          success: false,
          message: 'QR inválido o inactivo'
        });
      }

      // Verificar asistencia
      const verification = await AttendanceVerification.verifyAttendance(
        qrValidation.evento_id,
        usuario_id,
        qrValidation.qr_id
      );

      res.status(201).json({
        success: true,
        message: 'Asistencia verificada exitosamente',
        data: {
          verification: verification.toJSON(),
          evento: {
            id: qrValidation.evento_id,
            titulo: qrValidation.evento_titulo,
            fecha: qrValidation.evento_fecha
          }
        }
      });

    } catch (error) {
      console.error('Error al verificar asistencia:', error);
      
      if (error.message === 'No estás inscrito en este evento') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message === 'Ya has verificado tu asistencia a este evento') {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('QR inválido')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener historial de QR de un evento
  static async getEventQRHistory(req, res) {
    try {
      const { evento_id } = req.params;

      // Verificar que el evento existe
      const evento = await Event.findById(evento_id);
      if (!evento) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        });
      }

      const qrHistory = await AttendanceQR.getByEvent(evento_id);

      res.json({
        success: true,
        data: qrHistory.map(qr => qr.toJSON())
      });

    } catch (error) {
      console.error('Error al obtener historial de QR:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener verificaciones de asistencia de un evento
  static async getEventVerifications(req, res) {
    try {
      const { evento_id } = req.params;

      // Verificar que el evento existe
      const evento = await Event.findById(evento_id);
      if (!evento) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        });
      }

      const verifications = await AttendanceVerification.getByEvent(evento_id);

      res.json({
        success: true,
        data: verifications
      });

    } catch (error) {
      console.error('Error al obtener verificaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener estadísticas de asistencia de un evento
  static async getEventStats(req, res) {
    try {
      const { evento_id } = req.params;

      // Verificar que el evento existe
      const evento = await Event.findById(evento_id);
      if (!evento) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        });
      }

      const stats = await AttendanceVerification.getEventStats(evento_id);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Verificar si un usuario puede evaluar (asistió al evento)
  static async canUserEvaluate(req, res) {
    try {
      const { evento_id } = req.params;
      const usuario_id = req.user.id;

      // Verificar que el evento existe
      const evento = await Event.findById(evento_id);
      if (!evento) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        });
      }

      const canEvaluate = await AttendanceVerification.canUserEvaluate(usuario_id, evento_id);

      res.json({
        success: true,
        data: {
          puede_evaluar: canEvaluate,
          evento: {
            id: evento.id,
            titulo: evento.titulo,
            fecha_hora: evento.fecha_hora
          }
        }
      });

    } catch (error) {
      console.error('Error al verificar si puede evaluar:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener verificaciones de un usuario
  static async getUserVerifications(req, res) {
    try {
      const usuario_id = req.user.id;

      const verifications = await AttendanceVerification.getByUser(usuario_id);

      res.json({
        success: true,
        data: verifications
      });

    } catch (error) {
      console.error('Error al obtener verificaciones del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Desactivar QR de un evento
  static async deactivateQR(req, res) {
    try {
      const { evento_id } = req.params;

      // Verificar que el evento existe
      const evento = await Event.findById(evento_id);
      if (!evento) {
        return res.status(404).json({
          success: false,
          message: 'Evento no encontrado'
        });
      }

      const deactivated = await AttendanceQR.deactivateByEvent(evento_id);

      if (!deactivated) {
        return res.status(404).json({
          success: false,
          message: 'No hay QR activo para este evento'
        });
      }

      res.json({
        success: true,
        message: 'QR desactivado exitosamente'
      });

    } catch (error) {
      console.error('Error al desactivar QR:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = AttendanceController;
