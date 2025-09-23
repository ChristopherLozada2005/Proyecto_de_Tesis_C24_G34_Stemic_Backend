const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear directorios si no existen
const createUploadDirectories = () => {
  const uploadPaths = ['uploads', 'uploads/events', 'uploads/temp'];
  
  uploadPaths.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Inicializar directorios
createUploadDirectories();

// Configuración de almacenamiento para multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/events/');
  },
  filename: (req, file, cb) => {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `event-${uniqueSuffix}${extension}`);
  }
});

// Filtro para validar tipos de archivo
const fileFilter = (req, file, cb) => {
  // Tipos de archivo permitidos para imágenes
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedTypes.test(file.mimetype);

  if (mimeType && extName) {
    return cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen (JPEG, JPG, PNG, GIF, WebP)'));
  }
};

// Configuración de multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
    files: 1 // Solo un archivo por request
  },
  fileFilter: fileFilter
});

// Middleware para manejar la subida de imagen de evento
const uploadEventImage = upload.single('imagen');

// Middleware personalizado que maneja errores de multer
const handleUploadErrors = (req, res, next) => {
  uploadEventImage(req, res, (err) => {
    if (err) {
      // Manejar diferentes tipos de errores de multer
      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json({
              success: false,
              message: 'El archivo es demasiado grande. Máximo permitido: 5MB'
            });
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json({
              success: false,
              message: 'Solo se permite subir un archivo a la vez'
            });
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({
              success: false,
              message: 'Campo de archivo no esperado'
            });
          default:
            return res.status(400).json({
              success: false,
              message: 'Error al subir el archivo: ' + err.message
            });
        }
      } else {
        // Error personalizado (ej: tipo de archivo no válido)
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
    }

    // Si el archivo se subió correctamente, agregar la URL al request
    if (req.file) {
      // Construir URL del archivo (ajusta según tu configuración)
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      req.body.imagen_url = `${baseUrl}/uploads/events/${req.file.filename}`;
      
      // Guardar información del archivo para posible limpieza posterior
      req.uploadedFile = {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      };
    }

    next();
  });
};

// Middleware para eliminar archivo si hay error en la creación del evento
const cleanupOnError = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Si hay un archivo subido y la respuesta es de error, eliminar el archivo
    if (req.uploadedFile && res.statusCode >= 400) {
      try {
        if (fs.existsSync(req.uploadedFile.path)) {
          fs.unlinkSync(req.uploadedFile.path);
          console.log(`Archivo eliminado debido a error: ${req.uploadedFile.filename}`);
        }
      } catch (deleteError) {
        console.error('Error al eliminar archivo:', deleteError);
      }
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Función para eliminar archivo por nombre
const deleteFile = (filename) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join('uploads/events/', filename);
    
    fs.unlink(filePath, (err) => {
      if (err) {
        // Si el archivo no existe, no es un error crítico
        if (err.code === 'ENOENT') {
          console.log(`Archivo ya no existe: ${filename}`);
          resolve(true);
        } else {
          reject(err);
        }
      } else {
        console.log(`Archivo eliminado: ${filename}`);
        resolve(true);
      }
    });
  });
};

// Función para obtener información de un archivo
const getFileInfo = (filename) => {
  const filePath = path.join('uploads/events/', filename);
  
  try {
    const stats = fs.statSync(filePath);
    return {
      exists: true,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
};

// Middleware para validar que la imagen existe (para actualizaciones)
const validateImageExists = (req, res, next) => {
  if (req.body.imagen_url && !req.file) {
    // Si se proporciona una URL de imagen pero no se subió un archivo nuevo
    // validar que la URL apunta a un archivo existente en nuestro servidor
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const expectedPrefix = `${baseUrl}/uploads/events/`;
    
    if (req.body.imagen_url.startsWith(expectedPrefix)) {
      const filename = req.body.imagen_url.replace(expectedPrefix, '');
      const fileInfo = getFileInfo(filename);
      
      if (!fileInfo.exists) {
        return res.status(400).json({
          success: false,
          message: 'La imagen especificada no existe'
        });
      }
    }
  }
  
  next();
};

// Función para limpiar archivos antiguos (ejecutar periódicamente)
const cleanupOldFiles = (daysOld = 30) => {
  const uploadsDir = 'uploads/events/';
  const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
  
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error('Error al leer directorio de uploads:', err);
      return;
    }
    
    files.forEach(file => {
      const filePath = path.join(uploadsDir, file);
      
      fs.stat(filePath, (statErr, stats) => {
        if (statErr) {
          console.error(`Error al obtener stats del archivo ${file}:`, statErr);
          return;
        }
        
        if (stats.mtime.getTime() < cutoffTime) {
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
              console.error(`Error al eliminar archivo antiguo ${file}:`, unlinkErr);
            } else {
              console.log(`Archivo antiguo eliminado: ${file}`);
            }
          });
        }
      });
    });
  });
};

module.exports = {
  handleUploadErrors,
  cleanupOnError,
  deleteFile,
  getFileInfo,
  validateImageExists,
  cleanupOldFiles,
  
  // Exportar también la configuración de multer por si se necesita
  upload,
  uploadEventImage
};
