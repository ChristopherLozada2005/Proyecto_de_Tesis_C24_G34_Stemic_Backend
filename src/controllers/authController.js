const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../utils/mailer');
const User = require('../models/User');
const { generateTokens } = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthController {
  // Restablecer contraseña usando token
  static async resetPassword(req, res) {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ success: false, message: 'Token y nueva contraseña requeridos' });
      }
      // Buscar usuario por token válido
      const user = await User.findByPasswordResetToken(token);
      if (!user) {
        return res.status(400).json({ success: false, message: 'Token inválido o expirado' });
      }
      // Validar seguridad de la contraseña (puedes usar tu validador existente)
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres, incluir mayúscula, minúscula y número' });
      }
      // Hashear y guardar nueva contraseña, limpiar token
      await User.updatePasswordAndClearToken(user.id, password);
      return res.status(200).json({ success: true, message: 'Contraseña restablecida correctamente' });
    } catch (error) {
      console.error('Error en resetPassword:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }
  // Solicitud de recuperación de contraseña
  static async forgotPassword(req, res) {
    try {
      const { correo } = req.body;
      if (!correo) {
        return res.status(400).json({ success: false, message: 'Correo requerido' });
      }
      const user = await User.findByEmail(correo);
      if (!user) {
        // Por seguridad, responder igual aunque no exista
        return res.status(200).json({ success: true, message: 'Si el correo existe, se envió un email con instrucciones' });
      }
      // Generar token seguro y expiración (1 hora)
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
      await User.setPasswordResetToken(user.id, token, expires);
      // Enviar email
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.correo, resetLink);
      return res.status(200).json({ success: true, message: 'Si el correo existe, se envió un email con instrucciones' });
    } catch (error) {
      console.error('Error en forgotPassword:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }
  // Registro manual
  static async register(req, res) {
    try {
      const { nombre, correo, password } = req.body;

      // Verificar si ya existe
      const existingUser = await User.findByEmail(correo);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'El correo electrónico ya está registrado'
        });
      }

      // Crear usuario
      const newUser = await User.create({ nombre, correo, password });

      // Generar token
  const { accessToken } = await generateTokens(newUser.id);

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: newUser.toJSON(),
          token: accessToken,
          tokenType: 'Bearer'
        }
      });

    } catch (error) {
      console.error('Error en register:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Login manual
  static async login(req, res) {
    try {
      const { correo, password } = req.body;

      // Buscar usuario
      const user = await User.findByEmail(correo);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Verificar que no sea de Google
      if (!user.password) {
        return res.status(401).json({
          success: false,
          message: 'Esta cuenta fue creada con Google'
        });
      }

      // Verificar contraseña
      const isValid = await user.verifyPassword(password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Credenciales inválidas'
        });
      }

      // Generar token
  const { accessToken } = await generateTokens(user.id);

      res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          user: user.toJSON(),
          token: accessToken,
          tokenType: 'Bearer'
        }
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Autenticación con Google
  static async googleAuth(req, res) {
    try {
      const { token } = req.body;

      // Verificar token de Google
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const { sub: google_id, email, name, picture } = payload;

      // Buscar por Google ID
      let user = await User.findByGoogleId(google_id);

      if (user) {
        // Usuario existente
      } else {
        // Verificar email existente
        const existingEmailUser = await User.findByEmail(email);
        if (existingEmailUser) {
          return res.status(409).json({
            success: false,
            message: 'Ya existe una cuenta con este correo'
          });
        }

        // Crear nuevo usuario
        user = await User.createWithGoogle({
          nombre: name,
          correo: email,
          google_id,
          avatar_url: picture
        });
      }

      // Generar token JWT
  const { accessToken } = await generateTokens(user.id);

      res.json({
        success: true,
        message: 'Autenticación exitosa',
        data: {
          user: user.toJSON(),
          token: accessToken,
          tokenType: 'Bearer'
        }
      });

    } catch (error) {
      console.error('Error en googleAuth:', error);
      
      if (error.message.includes('Token') || error.message.includes('Invalid')) {
        return res.status(401).json({
          success: false,
          message: 'Token de Google inválido'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener perfil (requiere auth)
  static async getProfile(req, res) {
    try {
      const user = req.user; // Del middleware

      res.json({
        success: true,
        data: { user: user.toJSON() }
      });

    } catch (error) {
      console.error('Error en getProfile:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Logout
  static async logout(req, res) {
    try {
      res.json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    } catch (error) {
      console.error('Error en logout:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Refresh Token
  static async refreshAccessToken(req, res) {
    try {
      const { accessToken } = await generateTokens(req.user.id);
      res.json({
        success: true,
        data: {
          token: accessToken,
          tokenType: 'Bearer'
        }
      });
    } catch (error) {
      console.error('Error en refreshAccessToken:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = AuthController;