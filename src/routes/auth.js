const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateRegister, validateLogin, validateGoogleToken } = require('../middleware/validation');

// Rutas públicas
router.post('/register', validateRegister, AuthController.register);
router.post('/login', validateLogin, AuthController.login);
router.post('/google', validateGoogleToken, AuthController.googleAuth);
router.post('/refresh-token', AuthController.refreshAccessToken);
router.post('/logout', AuthController.logout);
router.post('/forgot-password', AuthController.forgotPassword);

// Rutas protegidas
router.get('/profile', authenticateToken, AuthController.getProfile);

module.exports = router;