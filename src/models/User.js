const { query } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  // Actualizar contraseña y limpiar token
  static async updatePasswordAndClearToken(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await query(
      'UPDATE users SET password = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
      [passwordHash, userId]
    );
  }
  constructor(userData) {
    this.id = userData.id;
    this.nombre = userData.nombre;
    this.correo = userData.correo;
    this.password = userData.password;
    this.google_id = userData.google_id;
    this.rol = userData.rol;
    this.created_at = userData.created_at;
    this.updated_at = userData.updated_at;
    this.password_reset_token = userData.password_reset_token;
    this.password_reset_expires = userData.password_reset_expires;
  }

  // Guardar token de recuperación y expiración
  static async setPasswordResetToken(userId, token, expires) {
    await query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [token, expires, userId]
    );
  }

  // Buscar usuario por token de recuperación
  static async findByPasswordResetToken(token) {
    const result = await query(
      'SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
      [token]
    );
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Crear usuario con email y password
  static async create({ nombre, correo, password, rol = 'usuario' }) {
    try {
      const passwordHash = await bcrypt.hash(password, 12);
      
      const result = await query(
        `INSERT INTO users (
          nombre, 
          correo, 
          password, 
          rol,
          created_at,
          updated_at
        ) 
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
        RETURNING *`,
        [nombre, correo, passwordHash, rol]
      );
      
      return new User(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        throw new Error('El correo electrónico ya está registrado');
      }
      throw error;
    }
  }

  // Crear usuario con Google
  static async createWithGoogle({ nombre, correo, google_id, avatar_url }) {
    try {
      const result = await query(
        `INSERT INTO users (
          nombre, 
          correo, 
          google_id,
          rol,
          created_at,
          updated_at
        ) 
        VALUES ($1, $2, $3, 'usuario', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
        RETURNING *`,
        [nombre, correo, google_id]
      );

      const user = new User(result.rows[0]);

      // Si viene avatar_url de Google, crear perfil inicial con avatar
      if (avatar_url) {
        const Profile = require('./Profile');
        await Profile.createOrUpdate(user.id, { avatar_url });
      }
      
      return user;
    } catch (error) {
      if (error.code === '23505') {
        throw new Error('El correo electrónico ya está registrado');
      }
      throw error;
    }
  }

  // Buscar por email
  static async findByEmail(correo) {
    const result = await query(
      'SELECT * FROM users WHERE correo = $1',
      [correo]
    );
    
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Buscar por Google ID
  static async findByGoogleId(google_id) {
    const result = await query(
      'SELECT * FROM users WHERE google_id = $1',
      [google_id]
    );
    
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Buscar por ID
  static async findById(id) {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Verificar password
  async verifyPassword(password) {
    if (!this.password) return false;
    return await bcrypt.compare(password, this.password);
  }

  // Datos públicos
  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      correo: this.correo,
      rol: this.rol,
      created_at: this.created_at
    };
  }
}

module.exports = User;