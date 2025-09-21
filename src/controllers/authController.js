const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthController {
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
      const token = generateToken(newUser.id);

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: newUser.toJSON(),
          token,
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
      const token = generateToken(user.id);

      res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: {
          user: user.toJSON(),
          token,
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
      const jwtToken = generateToken(user.id);

      res.json({
        success: true,
        message: 'Autenticación exitosa',
        data: {
          user: user.toJSON(),
          token: jwtToken,
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
      const token = generateToken(req.user.id);
      
      res.json({
        success: true,
        data: {
          token,
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