// Validaciones básicas para autenticación

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // Al menos 8 caracteres, una mayúscula, una minúscula, un número
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Validar registro
const validateRegister = (req, res, next) => {
  const { nombre, correo, password, confirmPassword } = req.body;
  const errors = [];

  // Validar nombre
  if (!nombre || nombre.trim().length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres');
  }

  // Validar correo
  if (!correo || !validateEmail(correo.trim())) {
    errors.push('Formato de correo electrónico inválido');
  }

  // Validar contraseña
  if (!password || !validatePassword(password)) {
    errors.push('La contraseña debe tener al menos 8 caracteres, incluir mayúscula, minúscula y número');
  }

  // Confirmar contraseña
  if (password !== confirmPassword) {
    errors.push('Las contraseñas no coinciden');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors
    });
  }

  // Limpiar datos
  req.body.nombre = nombre.trim();
  req.body.correo = correo.trim().toLowerCase();

  next();
};

// Validar login
const validateLogin = (req, res, next) => {
  const { correo, password } = req.body;
  const errors = [];

  if (!correo || !validateEmail(correo.trim())) {
    errors.push('Correo electrónico requerido');
  }

  if (!password) {
    errors.push('Contraseña requerida');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors
    });
  }

  req.body.correo = correo.trim().toLowerCase();
  next();
};

// Validar token de Google
const validateGoogleToken = (req, res, next) => {
  const { token } = req.body;

  if (!token || token.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Token de Google requerido'
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateGoogleToken
};