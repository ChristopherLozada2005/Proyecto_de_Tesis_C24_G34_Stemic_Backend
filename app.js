const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./src/docs/swagger.json');

// Importar configuración de base de datos
const { testConnection } = require('./src/config/database');

// Importar rutas
const authRoutes = require('./src/routes/auth');
const eventRoutes = require('./src/routes/events');
const inscriptionRoutes = require('./src/routes/inscriptions');
const postulationRoutes = require('./src/routes/postulations');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true
}));

// Middleware para parsing de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para servir archivos estáticos - REMOVIDO: Ahora usamos Cloudinary

// Logging básico
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});


// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api', inscriptionRoutes);
app.use('/api/postulations', postulationRoutes);

// Documentación Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API STEMIC funcionando',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        google: 'POST /api/auth/google',
        profile: 'GET /api/auth/profile'
      },
      events: {
        public: 'GET /api/events/public',
        create: 'POST /api/events',
        my_events: 'GET /api/events/user/my-events',
        options: 'GET /api/events/options'
      },
      profile: {
        get: 'GET /api/auth/profile',
        update: 'PUT /api/auth/profile',
        options: 'GET /api/auth/profile/options'
      }
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Servidor OK',
    timestamp: new Date().toISOString()
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

// Iniciar servidor
const startServer = async () => {
  try {
    // Probar conexión a BD
    await testConnection();
    
    app.listen(PORT, () => {
      console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
      console.log(`📱 API: http://localhost:${PORT}`);
      console.log(`🔐 Auth: http://localhost:${PORT}/api/auth`);
      console.log(`🎯 Events: http://localhost:${PORT}/api/events`);
      console.log(`👤 Profile: http://localhost:${PORT}/api/auth/profile`);
      console.log(`☁️ Cloudinary: Imágenes en CDN global`);
      console.log(`📚 Swagger: http://localhost:${PORT}/api/docs`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;