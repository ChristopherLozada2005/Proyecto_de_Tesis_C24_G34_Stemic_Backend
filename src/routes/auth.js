const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/authController.js');
const { 
  validateRegister, 
  validateLogin, 
  validateGoogleToken 
} = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// Rutas públicas
router.post('/register', validateRegister, AuthController.register);
router.post('/login', validateLogin, AuthController.login);
router.post('/google', validateGoogleToken, AuthController.googleAuth);

// Rutas protegidas
router.get('/profile', authenticateToken, AuthController.getProfile);

module.exports = router;