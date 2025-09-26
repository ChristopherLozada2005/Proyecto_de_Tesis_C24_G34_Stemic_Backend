const { query } = require('../config/database');

class Profile {
  constructor(profileData) {
    this.id = profileData.id;
    this.user_id = profileData.user_id;
    this.gender = profileData.gender;
    this.phone_number = profileData.phone_number;
    this.birth_date = profileData.birth_date;
    this.description = profileData.description;
    this.interests = profileData.interests || [];
    this.created_at = profileData.created_at;
    this.updated_at = profileData.updated_at;
  }

  // Crear o actualizar perfil
  static async createOrUpdate(userId, profileData) {
    try {
      const {
        gender,
        phone_number,
        birth_date,
        description,
        interests = []
      } = profileData;

      // Validar intereses están en el enum de tags
      if (interests.length > 0) {
        const validTags = ['ia', 'tech', 'networking'];
        const invalidTags = interests.filter(tag => !validTags.includes(tag));
        if (invalidTags.length > 0) {
          throw new Error(`Intereses inválidos: ${invalidTags.join(', ')}`);
        }
      }

      // Verificar si ya existe un perfil
      const existingProfile = await this.findByUserId(userId);

      let result;
      if (existingProfile) {
        // Actualizar perfil existente
        result = await query(
          `UPDATE profiles SET 
           gender = $1,
           phone_number = $2,
           birth_date = $3,
           description = $4,
           interests = $5,
           updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $6
           RETURNING *`,
          [gender, phone_number, birth_date, description, interests, userId]
        );
      } else {
        // Crear nuevo perfil
        result = await query(
          `INSERT INTO profiles (
            user_id,
            gender,
            phone_number,
            birth_date,
            description,
            interests,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *`,
          [userId, gender, phone_number, birth_date, description, interests]
        );
      }

      return new Profile(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Buscar perfil por ID de usuario
  static async findByUserId(userId) {
    try {
      const result = await query(
        'SELECT * FROM profiles WHERE user_id = $1',
        [userId]
      );
      
      return result.rows.length > 0 ? new Profile(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  // Obtener perfil completo con datos del usuario
  static async getCompleteProfile(userId) {
    try {
      const result = await query(
        `SELECT 
          u.id as user_id,
          u.nombre,
          u.correo,
          u.avatar_url,
          u.created_at as user_created_at,
          p.id as profile_id,
          p.gender,
          p.phone_number,
          p.birth_date,
          p.description,
          p.interests,
          p.created_at as profile_created_at,
          p.updated_at as profile_updated_at
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      
      return {
        user: {
          id: row.user_id,
          nombre: row.nombre,
          correo: row.correo,
          avatar_url: row.avatar_url,
          created_at: row.user_created_at
        },
        profile: row.profile_id ? {
          id: row.profile_id,
          gender: row.gender,
          phone_number: row.phone_number,
          birth_date: row.birth_date,
          description: row.description,
          interests: row.interests || [],
          created_at: row.profile_created_at,
          updated_at: row.profile_updated_at
        } : null
      };
    } catch (error) {
      throw error;
    }
  }

  // Obtener todas las opciones disponibles para el perfil
  static getProfileOptions() {
    return {
      genders: [
        { value: 'masculino', label: 'Masculino' },
        { value: 'femenino', label: 'Femenino' },
        { value: 'otro', label: 'Otro' },
        { value: 'prefiero_no_decir', label: 'Prefiero no decir' }
      ],
      interests: [
        { value: 'ia', label: 'Inteligencia Artificial' },
        { value: 'tech', label: 'Tecnología' },
        { value: 'networking', label: 'Networking' }
      ]
    };
  }

  // Datos públicos para JSON
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      gender: this.gender,
      phone_number: this.phone_number,
      birth_date: this.birth_date,
      description: this.description,
      interests: this.interests,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Profile;

