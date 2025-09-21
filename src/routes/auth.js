const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Rutas públicas
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/google', AuthController.googleAuth);
router.post('/refresh-token', AuthController.refreshAccessToken);
router.post('/logout', AuthController.logout);

// Rutas protegidas
router.get('/profile', authenticateToken, AuthController.getProfile);

module.exports = router;