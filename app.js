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
const partnerRoutes = require('./src/routes/partners');
const evaluationRoutes = require('./src/routes/evaluations');
const reportRoutes = require('./src/routes/reports');
const attendanceRoutes = require('./src/routes/attendance');
const recommendationRoutes = require('./src/routes/recommendations');
const userTrackingRoutes = require('./src/routes/userTracking');
const dashboardRoutes = require('./src/routes/dashboard');

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
app.use('/api/alianzas', partnerRoutes);
app.use('/api', evaluationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api', recommendationRoutes);
app.use('/api', userTrackingRoutes);
app.use('/api/dashboard', dashboardRoutes);

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
      },
      evaluations: {
        questions: 'GET /api/preguntas-evaluaciones',
        can_evaluate: 'GET /api/evaluaciones/can-evaluate/:evento_id',
        create: 'POST /api/evaluaciones',
        user_evaluations: 'GET /api/evaluaciones/user',
        event_evaluations: 'GET /api/evaluaciones/event/:evento_id',
        event_stats: 'GET /api/evaluaciones/stats/:evento_id'
      },
      attendance: {
        verify: 'POST /api/attendance/verify',
        can_evaluate: 'GET /api/attendance/can-evaluate/:evento_id',
        user_verifications: 'GET /api/attendance/user/verifications',
        generate_qr: 'POST /api/attendance/generate-qr',
        get_qr: 'GET /api/attendance/event/:evento_id/qr',
        qr_history: 'GET /api/attendance/event/:evento_id/qr-history',
        event_verifications: 'GET /api/attendance/event/:evento_id/verifications',
        event_stats: 'GET /api/attendance/event/:evento_id/stats',
        deactivate_qr: 'DELETE /api/attendance/event/:evento_id/qr'
      },
      recommendations: {
        user_recommendations: 'GET /api/recommendations/events',
        by_interest: 'GET /api/recommendations/interest/:interest',
        stats: 'GET /api/recommendations/stats'
      },
      user_tracking: {
        user_tracking: 'GET /api/users/:user_id/tracking',
        user_activity: 'GET /api/users/:user_id/activity',
        user_interests: 'GET /api/users/:user_id/interests'
      },
      dashboard: {
        system_metrics: 'GET /api/dashboard/system/metrics',
        metrics_by_period: 'GET /api/dashboard/system/metrics/period'
      },
        reports: {
          participation_data: 'GET /api/reports/participation',
          satisfaction_data: 'GET /api/reports/satisfaction',
          participation_excel: 'GET /api/reports/participation/excel',
          participation_pdf: 'GET /api/reports/participation/pdf',
          satisfaction_excel: 'GET /api/reports/satisfaction/excel',
          satisfaction_pdf: 'GET /api/reports/satisfaction/pdf',
          history: 'GET /api/reports/history',
          stats: 'GET /api/reports/stats',
          admin_all: 'GET /api/reports/admin/all',
          admin_stats: 'GET /api/reports/admin/stats',
          cache_stats: 'GET /api/reports/cache/stats',
          cache_data: 'GET /api/reports/cache/data',
          cache_update: 'POST /api/reports/cache/update/:evento_id',
          cache_clean: 'POST /api/reports/cache/clean'
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