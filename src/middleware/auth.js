const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { query } = require('../config/database');

// Constantes de configuración
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

// Generar tokens
const generateTokens = async (userId) => {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  // Guardar refresh token en la base de datos
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  await query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at) 
     VALUES ($1, $2, $3)`,
    [userId, refreshToken, expiresAt]
  );

  return { accessToken, refreshToken };
};

// Middleware para verificar access token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Tipo de token inválido'
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    handleAuthError(error, res);
  }
};

// Renovar access token usando refresh token
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token requerido'
      });
    }

    // Verificar token en la base de datos
    const tokenRecord = await query(
      `SELECT * FROM refresh_tokens 
       WHERE token = $1 
       AND revoked_at IS NULL 
       AND expires_at > CURRENT_TIMESTAMP`,
      [refreshToken]
    );

    if (tokenRecord.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token inválido o expirado'
      });
    }

    // Verificar firma del refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Tipo de token inválido'
      });
    }

    // Generar nuevo access token
    const accessToken = jwt.sign(
      { userId: decoded.userId, type: 'access' },
      JWT_ACCESS_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );

    res.json({
      success: true,
      data: { accessToken }
    });

  } catch (error) {
    handleAuthError(error, res);
  }
};

// Revocar refresh token (logout)
const revokeRefreshToken = async (token) => {
  await query(
    `UPDATE refresh_tokens 
     SET revoked_at = CURRENT_TIMESTAMP 
     WHERE token = $1`,
    [token]
  );
};

// Manejador de errores de autenticación
const handleAuthError = (error, res) => {
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expirado'
    });
  }

  console.error('Error de autenticación:', error);
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
};

module.exports = {
  authenticateToken,
  generateTokens,
  refreshAccessToken,
  revokeRefreshToken
};