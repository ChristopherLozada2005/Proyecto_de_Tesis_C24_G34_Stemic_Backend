const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'shuttle.proxy.rlwy.net',
  database: process.env.DB_NAME || 'railway',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
});

// Función para probar la conexión
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conexión a PostgreSQL establecida correctamente');
    client.release();
  } catch (err) {
    console.error('❌ Error al conectar con PostgreSQL:', err.message);
  }
};

// Función para ejecutar queries de forma segura
const query = (text, params) => pool.query(text, params);

// Función para obtener un cliente del pool (para transacciones)
const getClient = () => pool.connect();

module.exports = {
  pool,
  query,
  getClient,
  testConnection
};