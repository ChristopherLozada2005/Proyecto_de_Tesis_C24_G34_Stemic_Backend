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

// Validaciones para eventos
const validateEvent = (req, res, next) => {
  const {
    titulo,
    descripcion,
    fecha_aplicacion_prioritaria,
    fecha_aplicacion_general,
    duracion,
    correo_contacto,
    modalidad,
    lugar,
    fecha_hora,
    skills,
    tags
  } = req.body;

  const errors = [];

  // Validar campos requeridos
  if (!titulo || titulo.trim().length < 3) {
    errors.push('El título debe tener al menos 3 caracteres');
  }

  if (!descripcion || descripcion.trim().length < 10) {
    errors.push('La descripción debe tener al menos 10 caracteres');
  }

  if (!fecha_aplicacion_prioritaria) {
    errors.push('La fecha de aplicación prioritaria es requerida');
  }

  if (!fecha_aplicacion_general) {
    errors.push('La fecha de aplicación general es requerida');
  }

  if (!duracion || duracion.trim().length === 0) {
    errors.push('La duración del evento es requerida');
  } else {
    // Validar formato HH:MM:SS
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    if (!timeRegex.test(duracion.trim())) {
      errors.push('La duración debe estar en formato HH:MM:SS (ejemplo: 02:30:00)');
    }
  }

  if (!correo_contacto || !validateEmail(correo_contacto.trim())) {
    errors.push('Correo de contacto inválido');
  }

  if (!modalidad || !['virtual', 'presencial', 'hibrido'].includes(modalidad)) {
    errors.push('Modalidad inválida. Debe ser: virtual, presencial o hibrido');
  }

  if (!fecha_hora) {
    errors.push('La fecha y hora del evento es requerida');
  }

  // Validar que modalidad presencial o híbrida tenga lugar
  if ((modalidad === 'presencial' || modalidad === 'hibrido') && (!lugar || lugar.trim().length === 0)) {
    errors.push('El lugar es requerido para eventos presenciales e híbridos');
  }

  // Validar fechas
  if (fecha_aplicacion_prioritaria && fecha_aplicacion_general) {
    const fechaPrioritaria = new Date(fecha_aplicacion_prioritaria);
    const fechaGeneral = new Date(fecha_aplicacion_general);
    
    if (fechaGeneral < fechaPrioritaria) {
      errors.push('La fecha de aplicación general debe ser posterior o igual a la fecha prioritaria');
    }
  }

  if (fecha_hora) {
    const fechaEvento = new Date(fecha_hora);
    const ahora = new Date();
    
    if (fechaEvento <= ahora) {
      errors.push('La fecha del evento debe ser futura');
    }
  }

  // Procesar y validar skills (solo 5 opciones permitidas)
  if (skills !== undefined && skills !== null && skills !== '') {
    let skillsArray = skills;
    
    // Si viene como string, convertir a array
    if (typeof skills === 'string') {
      try {
        // Intentar parsear como JSON primero
        skillsArray = JSON.parse(skills);
      } catch (e) {
        // Si no es JSON, separar por comas
        skillsArray = skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
    }
    
    // Validar que sea array
    if (!Array.isArray(skillsArray)) {
      errors.push('Skills debe ser un array');
    } else {
      // Validar que solo contenga skills permitidos
      const skillsValidos = ['Liderazgo', 'Pensamiento Critico', 'Colaboracion', 'Conocimiento Tecnico', 'Comunicacion'];
      const skillsInvalidos = skillsArray.filter(skill => !skillsValidos.includes(skill.trim()));
      
      if (skillsInvalidos.length > 0) {
        errors.push(`Skills inválidos: ${skillsInvalidos.join(', ')}. Skills válidos: ${skillsValidos.join(', ')}`);
      } else {
        // Limpiar y eliminar duplicados
        req.body.skills = [...new Set(skillsArray.map(s => s.trim()))];
      }
    }
  }

  // Procesar y validar tags si se proporcionan
  if (tags !== undefined && tags !== null && tags !== '') {
    let tagsArray = tags;
    
    // Si viene como string, convertir a array
    if (typeof tags === 'string') {
      try {
        // Intentar parsear como JSON primero
        tagsArray = JSON.parse(tags);
      } catch (e) {
        // Si no es JSON, separar por comas
        tagsArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      }
    }
    
    // Validar que sea array
    if (!Array.isArray(tagsArray)) {
      errors.push('Tags debe ser un array o string separado por comas');
    } else {
      // Mapeo de valores mostrados al usuario a valores de BD
      const tagsMapping = {
        'IA': 'ia',
        'TECH': 'tech',
        'NETWORKING': 'networking'
      };
      
      const tagsValidos = Object.keys(tagsMapping);
      const tagsInvalidos = tagsArray.filter(tag => !tagsValidos.includes(tag.trim()));
      
      if (tagsInvalidos.length > 0) {
        errors.push(`Tags inválidos: ${tagsInvalidos.join(', ')}. Tags válidos: ${tagsValidos.join(', ')}`);
      } else {
        // Convertir a valores de BD y asignar al req.body
        req.body.tags = tagsArray.map(t => tagsMapping[t.trim()]);
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors
    });
  }

  // Limpiar y normalizar datos
  if (req.body.titulo) req.body.titulo = req.body.titulo.trim();
  if (req.body.descripcion) req.body.descripcion = req.body.descripcion.trim();
  if (req.body.duracion) req.body.duracion = req.body.duracion.trim();
  if (req.body.correo_contacto) req.body.correo_contacto = req.body.correo_contacto.trim().toLowerCase();
  if (req.body.lugar) req.body.lugar = req.body.lugar.trim();
  if (req.body.informacion_adicional) req.body.informacion_adicional = req.body.informacion_adicional.trim();

  next();
};

// Validación para actualización de eventos (campos opcionales)
const validateEventUpdate = (req, res, next) => {
  const {
    titulo,
    descripcion,
    fecha_aplicacion_prioritaria,
    fecha_aplicacion_general,
    duracion,
    correo_contacto,
    modalidad,
    lugar,
    fecha_hora,
    skills,
    tags
  } = req.body;

  const errors = [];

  // Validar solo los campos que se están actualizando
  if (titulo !== undefined && (typeof titulo !== 'string' || titulo.trim().length < 3)) {
    errors.push('El título debe tener al menos 3 caracteres');
  }

  if (descripcion !== undefined && (typeof descripcion !== 'string' || descripcion.trim().length < 10)) {
    errors.push('La descripción debe tener al menos 10 caracteres');
  }

  if (duracion !== undefined) {
    if (typeof duracion !== 'string' || duracion.trim().length === 0) {
      errors.push('La duración del evento no puede estar vacía');
    } else {
      // Validar formato HH:MM:SS
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
      if (!timeRegex.test(duracion.trim())) {
        errors.push('La duración debe estar en formato HH:MM:SS (ejemplo: 02:30:00)');
      }
    }
  }

  if (correo_contacto !== undefined && !validateEmail(correo_contacto.trim())) {
    errors.push('Correo de contacto inválido');
  }

  if (modalidad !== undefined && !['virtual', 'presencial', 'hibrido'].includes(modalidad)) {
    errors.push('Modalidad inválida. Debe ser: virtual, presencial o hibrido');
  }

  // Validar que modalidad presencial o híbrida tenga lugar
  if (modalidad && (modalidad === 'presencial' || modalidad === 'hibrido') && 
      (!lugar || lugar.trim().length === 0)) {
    errors.push('El lugar es requerido para eventos presenciales e híbridos');
  }

  // Validar fechas si se proporcionan
  if (fecha_aplicacion_prioritaria && fecha_aplicacion_general) {
    const fechaPrioritaria = new Date(fecha_aplicacion_prioritaria);
    const fechaGeneral = new Date(fecha_aplicacion_general);
    
    if (fechaGeneral < fechaPrioritaria) {
      errors.push('La fecha de aplicación general debe ser posterior o igual a la fecha prioritaria');
    }
  }

  if (fecha_hora !== undefined) {
    const fechaEvento = new Date(fecha_hora);
    const ahora = new Date();
    
    if (fechaEvento <= ahora) {
      errors.push('La fecha del evento debe ser futura');
    }
  }

  // Procesar y validar skills (solo 5 opciones permitidas)
  if (skills !== undefined && skills !== null && skills !== '') {
    let skillsArray = skills;
    
    // Si viene como string, convertir a array
    if (typeof skills === 'string') {
      try {
        skillsArray = JSON.parse(skills);
      } catch (e) {
        skillsArray = skills.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
    }
    
    if (!Array.isArray(skillsArray)) {
      errors.push('Skills debe ser un array');
    } else {
      // Validar que solo contenga skills permitidos
      const skillsValidos = ['Liderazgo', 'Pensamiento Critico', 'Colaboracion', 'Conocimiento Tecnico', 'Comunicacion'];
      const skillsInvalidos = skillsArray.filter(skill => !skillsValidos.includes(skill.trim()));
      
      if (skillsInvalidos.length > 0) {
        errors.push(`Skills inválidos: ${skillsInvalidos.join(', ')}. Skills válidos: ${skillsValidos.join(', ')}`);
      } else {
        req.body.skills = [...new Set(skillsArray.map(s => s.trim()))];
      }
    }
  }

  // Procesar y validar tags si se proporcionan
  if (tags !== undefined) {
    let tagsArray = tags;
    
    // Si viene como string, convertir a array
    if (typeof tags === 'string') {
      try {
        tagsArray = JSON.parse(tags);
      } catch (e) {
        tagsArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      }
    }
    
    if (!Array.isArray(tagsArray)) {
      errors.push('Tags debe ser un array o string separado por comas');
    } else {
      // Mapeo de valores mostrados al usuario a valores de BD
      const tagsMapping = {
        'IA': 'ia',
        'TECH': 'tech',
        'NETWORKING': 'networking'
      };
      
      const tagsValidos = Object.keys(tagsMapping);
      const tagsInvalidos = tagsArray.filter(tag => !tagsValidos.includes(tag.trim()));
      
      if (tagsInvalidos.length > 0) {
        errors.push(`Tags inválidos: ${tagsInvalidos.join(', ')}. Tags válidos: ${tagsValidos.join(', ')}`);
      } else {
        req.body.tags = tagsArray.map(t => tagsMapping[t.trim()]);
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors
    });
  }

  // Limpiar y normalizar datos
  if (req.body.titulo) req.body.titulo = req.body.titulo.trim();
  if (req.body.descripcion) req.body.descripcion = req.body.descripcion.trim();
  if (req.body.duracion) req.body.duracion = req.body.duracion.trim();
  if (req.body.correo_contacto) req.body.correo_contacto = req.body.correo_contacto.trim().toLowerCase();
  if (req.body.lugar) req.body.lugar = req.body.lugar.trim();
  if (req.body.informacion_adicional) req.body.informacion_adicional = req.body.informacion_adicional.trim();

  next();
};

// Validar parámetros de consulta para filtros
const validateEventFilters = (req, res, next) => {
  const { modalidad, skills, tags, fecha_desde, fecha_hasta, page, limit } = req.query;
  const errors = [];

  if (modalidad && !['virtual', 'presencial', 'hibrido'].includes(modalidad)) {
    errors.push('Modalidad de filtro inválida');
  }

  if (skills && typeof skills === 'string') {
    const skillsValidos = ['Liderazgo', 'Pensamiento Critico', 'Colaboracion', 'Conocimiento Tecnico', 'Comunicacion'];
    const skillsArray = skills.split(',');
    const skillsInvalidos = skillsArray.filter(skill => !skillsValidos.includes(skill.trim()));
    
    if (skillsInvalidos.length > 0) {
      errors.push(`Skills de filtro inválidos: ${skillsInvalidos.join(', ')}`);
    }
  }

  if (tags && typeof tags === 'string') {
    const tagsValidos = ['IA', 'TECH', 'NETWORKING'];
    const tagsArray = tags.split(',');
    const tagsInvalidos = tagsArray.filter(tag => !tagsValidos.includes(tag.trim()));
    
    if (tagsInvalidos.length > 0) {
      errors.push(`Tags de filtro inválidos: ${tagsInvalidos.join(', ')}`);
    }
  }

  if (fecha_desde && isNaN(Date.parse(fecha_desde))) {
    errors.push('Formato de fecha_desde inválido');
  }

  if (fecha_hasta && isNaN(Date.parse(fecha_hasta))) {
    errors.push('Formato de fecha_hasta inválido');
  }

  if (page && (isNaN(page) || parseInt(page) < 1)) {
    errors.push('Número de página inválido');
  }

  if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
    errors.push('Límite inválido (debe ser entre 1 y 100)');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación en filtros',
      errors
    });
  }

  next();
};

// Validación para perfil de usuario
const validateProfile = (req, res, next) => {
  const { avatar_url, gender, phone_number, birth_date, description, interests } = req.body;
  const errors = [];

  // Validar avatar_url si se proporciona
  if (avatar_url !== undefined && avatar_url !== null && avatar_url !== '') {
    if (typeof avatar_url !== 'string') {
      errors.push('La URL del avatar debe ser texto');
    } else if (avatar_url.trim().length > 500) {
      errors.push('La URL del avatar no puede exceder 500 caracteres');
    } else {
      // Validación básica de formato URL
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(avatar_url.trim())) {
        errors.push('La URL del avatar debe ser una URL válida (http:// o https://)');
      }
    }
  }

  // Validar género si se proporciona
  if (gender && !['masculino', 'femenino', 'otro', 'prefiero_no_decir'].includes(gender)) {
    errors.push('Género inválido. Opciones válidas: masculino, femenino, otro, prefiero_no_decir');
  }

  // Validar número telefónico si se proporciona
  if (phone_number !== undefined && phone_number !== null && phone_number !== '') {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{7,20}$/;
    if (!phoneRegex.test(phone_number.trim())) {
      errors.push('Formato de número telefónico inválido. Debe contener entre 7 y 20 dígitos, puede incluir +, espacios, guiones y paréntesis');
    }
  }

  // Validar fecha de nacimiento si se proporciona
  if (birth_date !== undefined && birth_date !== null && birth_date !== '') {
    const birthDate = new Date(birth_date);
    const today = new Date();
    
    if (isNaN(birthDate.getTime())) {
      errors.push('Formato de fecha de nacimiento inválido');
    } else {
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 13) {
        errors.push('Debes tener al menos 13 años para usar esta plataforma');
      }
      
      if (age > 120) {
        errors.push('Fecha de nacimiento inválida');
      }
    }
  }

  // Validar descripción si se proporciona
  if (description !== undefined && description !== null && description !== '') {
    if (typeof description !== 'string') {
      errors.push('La descripción debe ser texto');
    } else if (description.trim().length > 1000) {
      errors.push('La descripción no puede exceder 1000 caracteres');
    }
  }

  // Validar intereses si se proporcionan
  if (interests !== undefined && interests !== null) {
    let interestsArray = interests;
    
    // Si viene como string, convertir a array
    if (typeof interests === 'string') {
      try {
        interestsArray = JSON.parse(interests);
      } catch (e) {
        interestsArray = interests.split(',').map(i => i.trim()).filter(i => i.length > 0);
      }
    }
    
    if (!Array.isArray(interestsArray)) {
      errors.push('Los intereses deben ser un array');
    } else {
      const validInterests = ['ia', 'tech', 'networking'];
      const invalidInterests = interestsArray.filter(interest => !validInterests.includes(interest.trim().toLowerCase()));
      
      if (invalidInterests.length > 0) {
        errors.push(`Intereses inválidos: ${invalidInterests.join(', ')}. Intereses válidos: ${validInterests.join(', ')}`);
      } else {
        // Limpiar, convertir a minúsculas y eliminar duplicados
        req.body.interests = [...new Set(interestsArray.map(i => i.trim().toLowerCase()))];
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación en el perfil',
      errors
    });
  }

  // Limpiar datos
  if (avatar_url) req.body.avatar_url = avatar_url.trim();
  if (phone_number) req.body.phone_number = phone_number.trim();
  if (description) req.body.description = description.trim();

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateGoogleToken,
  validateEvent,
  validateEventUpdate,
  validateEventFilters,
  validateProfile
};