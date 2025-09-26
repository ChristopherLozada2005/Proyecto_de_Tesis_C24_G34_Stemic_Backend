const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const ProfileController = require('../controllers/profileController');
const { authenticateToken } = require('../middleware/auth');
const { validateRegister, validateLogin, validateGoogleToken, validateProfile } = require('../middleware/validation');
const { handleProfileImageUpload, cleanupImageOnError } = require('../middleware/cloudinaryUpload');

// Rutas públicas
router.post('/register', validateRegister, AuthController.register);
router.post('/login', validateLogin, AuthController.login);
router.post('/google', validateGoogleToken, AuthController.googleAuth);
router.post('/refresh-token', AuthController.refreshAccessToken);
router.post('/logout', AuthController.logout);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

// Rutas protegidas - Perfil del usuario autenticado
router.get('/profile', authenticateToken, AuthController.getProfile);
router.put('/profile', 
  authenticateToken, 
  handleProfileImageUpload,    // Manejar upload de imagen (opcional)
  cleanupImageOnError,         // Limpiar imagen si hay error
  validateProfile, 
  ProfileController.updateProfile
);
router.get('/profile/options', authenticateToken, ProfileController.getProfileOptions);

module.exports = router;