const multer = require('multer');
const { profileStorage, eventStorage, deleteImage, extractPublicId } = require('../config/cloudinary');

// Configurar Multer con Cloudinary para perfiles
const uploadProfileImage = multer({
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Validar tipos de archivo
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extName = allowedTypes.test(file.originalname.toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);

    if (mimeType && extName) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (JPEG, JPG, PNG, WebP)'));
    }
  }
});

// Configurar Multer con Cloudinary para eventos
const uploadEventImage = multer({
  storage: eventStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB para eventos
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extName = allowedTypes.test(file.originalname.toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);

    if (mimeType && extName) {
      return cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (JPEG, JPG, PNG, WebP)'));
    }
  }
});

// Middleware para manejar upload de imagen de perfil
const handleProfileImageUpload = (req, res, next) => {
  uploadProfileImage.single('avatar')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json({
              success: false,
              message: 'La imagen es demasiado grande. Máximo permitido: 5MB'
            });
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({
              success: false,
              message: 'Campo de archivo no esperado. Use "avatar"'
            });
          default:
            return res.status(400).json({
              success: false,
              message: 'Error al subir imagen: ' + err.message
            });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
    }

    // Si se subió archivo, agregar URL al body
    if (req.file) {
      req.body.avatar_url = req.file.path; // Cloudinary devuelve la URL en path
      req.uploadedFile = {
        url: req.file.path,
        publicId: req.file.filename // Cloudinary devuelve public_id en filename
      };
    }

    next();
  });
};

// Middleware para manejar upload de imagen de evento
const handleEventImageUpload = (req, res, next) => {
  uploadEventImage.single('imagen')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(400).json({
              success: false,
              message: 'La imagen es demasiado grande. Máximo permitido: 10MB'
            });
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({
              success: false,
              message: 'Campo de archivo no esperado. Use "imagen"'
            });
          default:
            return res.status(400).json({
              success: false,
              message: 'Error al subir imagen: ' + err.message
            });
        }
      } else {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
    }

    // Si se subió archivo, agregar URL al body
    if (req.file) {
      req.body.imagen_url = req.file.path;
      req.uploadedFile = {
        url: req.file.path,
        publicId: req.file.filename
      };
    }

    next();
  });
};

// Middleware para limpiar imagen en caso de error
const cleanupImageOnError = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Si hay error y se subió una imagen, eliminarla de Cloudinary
    if (req.uploadedFile && res.statusCode >= 400) {
      deleteImage(req.uploadedFile.publicId)
        .then(() => {
          console.log(`Imagen eliminada de Cloudinary: ${req.uploadedFile.publicId}`);
        })
        .catch((error) => {
          console.error('Error al eliminar imagen de Cloudinary:', error);
        });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Función auxiliar para eliminar imagen anterior
const deleteOldImage = async (imageUrl) => {
  if (!imageUrl) return;
  
  const publicId = extractPublicId(imageUrl);
  if (publicId) {
    try {
      await deleteImage(publicId);
      console.log(`Imagen anterior eliminada: ${publicId}`);
    } catch (error) {
      console.error('Error al eliminar imagen anterior:', error);
    }
  }
};

module.exports = {
  handleProfileImageUpload,
  handleEventImageUpload,
  cleanupImageOnError,
  deleteOldImage
};