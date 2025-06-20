const { query } = require('../config/database');
const bcrypt = require('bcrypt');

class User {
  constructor(userData) {
    this.id = userData.id;
    this.nombre = userData.nombre;
    this.correo = userData.correo;
    this.password_hash = userData.password_hash;
    this.google_id = userData.google_id;
    this.avatar_url = userData.avatar_url;
    this.rol = userData.rol;
    this.created_at = userData.created_at;
    this.updated_at = userData.updated_at;
  }

  // Crear usuario con email y password
  static async create({ nombre, correo, password, rol = 'usuario' }) {
    try {
      const passwordHash = await bcrypt.hash(password, 12);
      
      const result = await query(
        `INSERT INTO users (nombre, correo, password_hash, rol) 
         VALUES ($1, $2, $3, $4) 
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
        `INSERT INTO users (nombre, correo, google_id, avatar_url) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [nombre, correo, google_id, avatar_url]
      );
      
      return new User(result.rows[0]);
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
    if (!this.password_hash) return false;
    return await bcrypt.compare(password, this.password_hash);
  }

  // Datos públicos
  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      correo: this.correo,
      avatar_url: this.avatar_url,
      rol: this.rol,
      created_at: this.created_at
    };
  }
}

module.exports = User;