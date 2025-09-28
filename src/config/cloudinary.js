const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage para avatars de perfil
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'stemic/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto' }
    ]
  }
});

// Storage para imágenes de eventos
const eventStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'stemic/events',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 800, height: 400, crop: 'fill' },
      { quality: 'auto' }
    ]
  }
});

// Storage para logos de alianzas
const partnerStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'stemic/partners',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
    transformation: [
      { width: 300, height: 300, crop: 'fill', gravity: 'center' },
      { quality: 'auto' }
    ]
  }
});

// Función para eliminar imagen
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error eliminando imagen:', error);
    throw error;
  }
};

// Extraer public_id de URL de Cloudinary
const extractPublicId = (url) => {
  if (!url) return null;
  
  // URL típica: https://res.cloudinary.com/cloud/image/upload/v123456/stemic/events/abc123.jpg
  const matches = url.match(/\/([^\/]+)\/([^\/]+)\/v\d+\/(.+)\./);
  return matches ? matches[3] : null;
};

module.exports = {
  cloudinary,
  profileStorage,
  eventStorage,
  partnerStorage,
  deleteImage,
  extractPublicId
};

