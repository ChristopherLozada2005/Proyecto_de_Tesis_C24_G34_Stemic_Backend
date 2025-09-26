const Profile = require('../models/Profile');

class ProfileController {
  // Obtener perfil completo del usuario autenticado
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;
      
      const profileData = await Profile.getCompleteProfile(userId);
      
      if (!profileData) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      res.json({
        success: true,
        data: {
          // Datos del usuario (desde la tabla users)
          nombre: profileData.user.nombre,
          correo: profileData.user.correo,
          avatar_url: profileData.user.avatar_url,
          
          // Datos del perfil (desde la tabla profiles)
          gender: profileData.profile?.gender || null,
          phone_number: profileData.profile?.phone_number || null,
          birth_date: profileData.profile?.birth_date || null,
          description: profileData.profile?.description || null,
          interests: profileData.profile?.interests || [],
          
          // Metadatos
          user_created_at: profileData.user.created_at,
          profile_updated_at: profileData.profile?.updated_at || null
        }
      });
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar/crear perfil del usuario
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const { gender, phone_number, birth_date, description, interests } = req.body;

      // Validación básica
      if (birth_date) {
        const birthDate = new Date(birth_date);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        if (age < 13) {
          return res.status(400).json({
            success: false,
            message: 'Debes tener al menos 13 años para usar esta plataforma'
          });
        }
      }

      if (phone_number && !/^[\+]?[0-9\s\-\(\)]{7,20}$/.test(phone_number)) {
        return res.status(400).json({
          success: false,
          message: 'Formato de número telefónico inválido'
        });
      }

      if (description && description.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'La descripción no puede exceder 1000 caracteres'
        });
      }

      // Crear o actualizar perfil
      const profile = await Profile.createOrUpdate(userId, {
        gender,
        phone_number,
        birth_date,
        description,
        interests
      });

      // Obtener perfil completo actualizado
      const completeProfile = await Profile.getCompleteProfile(userId);

      res.json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: {
          nombre: completeProfile.user.nombre,
          correo: completeProfile.user.correo,
          avatar_url: completeProfile.user.avatar_url,
          gender: completeProfile.profile?.gender || null,
          phone_number: completeProfile.profile?.phone_number || null,
          birth_date: completeProfile.profile?.birth_date || null,
          description: completeProfile.profile?.description || null,
          interests: completeProfile.profile?.interests || [],
          user_created_at: completeProfile.user.created_at,
          profile_updated_at: completeProfile.profile?.updated_at || null
        }
      });
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      
      if (error.message.includes('Intereses inválidos')) {
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

  // Obtener opciones disponibles para el perfil
  static async getProfileOptions(req, res) {
    try {
      const options = Profile.getProfileOptions();
      
      res.json({
        success: true,
        data: options
      });
    } catch (error) {
      console.error('Error al obtener opciones de perfil:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Método deleteProfile removido - no necesario para el flujo de "Mi Perfil"
}

module.exports = ProfileController;

