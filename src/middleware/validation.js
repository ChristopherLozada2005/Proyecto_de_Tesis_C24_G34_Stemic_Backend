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
    // Mapeo flexible: acepta tanto mayúsculas como minúsculas
    const tagsMapping = {
      'IA': 'ia',
      'ia': 'ia',
      'TECH': 'tech', 
      'tech': 'tech',
      'NETWORKING': 'networking',
      'networking': 'networking'
    };
    
    const tagsArray = tags.split(',');
    const tagsInvalidos = tagsArray.filter(tag => !tagsMapping[tag.trim()]);
    
    if (tagsInvalidos.length > 0) {
      errors.push(`Tags de filtro inválidos: ${tagsInvalidos.join(', ')}. Tags válidos: ia, tech, networking (o IA, TECH, NETWORKING)`);
    } else {
      // Convertir a valores de BD (minúsculas) en req.query para el controlador
      req.query.tags = tagsArray.map(tag => tagsMapping[tag.trim()]).join(',');
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

// =============================================
// VALIDACIÓN DE INSCRIPCIONES
// =============================================

// Validar parámetros de paginación para inscripciones
const validateInscriptionPagination = (req, res, next) => {
  const { page, limit } = req.query;
  const errors = [];

  // Validar page
  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('El parámetro page debe ser un número entero mayor a 0');
    } else {
      req.query.page = pageNum;
    }
  }

  // Validar limit
  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('El parámetro limit debe ser un número entero entre 1 y 100');
    } else {
      req.query.limit = limitNum;
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación en parámetros de paginación',
      errors
    });
  }

  next();
};

// Validar UUID de evento
const validateEventId = (req, res, next) => {
  const { id } = req.params;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de evento inválido. Debe ser un UUID válido'
    });
  }

  next();
};

// =============================================
// VALIDACIÓN DE POSTULACIONES
// =============================================

// Validar datos de postulación
const validatePostulation = (req, res, next) => {
  const { carrera_especialidad, motivacion } = req.body;
  const errors = [];

  // Validar carrera_especialidad
  if (!carrera_especialidad || typeof carrera_especialidad !== 'string') {
    errors.push('La carrera o especialidad es requerida');
  } else if (carrera_especialidad.trim().length < 2) {
    errors.push('La carrera o especialidad debe tener al menos 2 caracteres');
  } else if (carrera_especialidad.trim().length > 100) {
    errors.push('La carrera o especialidad no puede exceder 100 caracteres');
  }

  // Validar motivacion
  if (!motivacion || typeof motivacion !== 'string') {
    errors.push('La motivación es requerida');
  } else if (motivacion.trim().length < 10) {
    errors.push('La motivación debe tener al menos 10 caracteres');
  } else if (motivacion.trim().length > 1000) {
    errors.push('La motivación no puede exceder 1000 caracteres');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación en la postulación',
      errors
    });
  }

  // Limpiar datos
  req.body.carrera_especialidad = carrera_especialidad.trim();
  req.body.motivacion = motivacion.trim();

  next();
};

// Validar parámetros de paginación para postulaciones
const validatePostulationPagination = (req, res, next) => {
  const { page, limit, estado, carrera_especialidad, fecha_desde, fecha_hasta } = req.query;
  const errors = [];

  // Validar page
  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('El parámetro page debe ser un número entero mayor a 0');
    } else {
      req.query.page = pageNum;
    }
  }

  // Validar limit
  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('El parámetro limit debe ser un número entero entre 1 y 100');
    } else {
      req.query.limit = limitNum;
    }
  }

  // Validar estado
  if (estado !== undefined) {
    const validStates = ['pendiente', 'aprobada', 'rechazada'];
    if (!validStates.includes(estado)) {
      errors.push(`Estado inválido. Estados válidos: ${validStates.join(', ')}`);
    }
  }

  // Validar carrera_especialidad
  if (carrera_especialidad !== undefined) {
    if (typeof carrera_especialidad !== 'string' || carrera_especialidad.trim().length === 0) {
      errors.push('El filtro de carrera debe ser un texto válido');
    } else {
      req.query.carrera_especialidad = carrera_especialidad.trim();
    }
  }

  // Validar fechas
  if (fecha_desde !== undefined) {
    const date = new Date(fecha_desde);
    if (isNaN(date.getTime())) {
      errors.push('La fecha desde debe ser una fecha válida (YYYY-MM-DD)');
    }
  }

  if (fecha_hasta !== undefined) {
    const date = new Date(fecha_hasta);
    if (isNaN(date.getTime())) {
      errors.push('La fecha hasta debe ser una fecha válida (YYYY-MM-DD)');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación en parámetros de filtros',
      errors
    });
  }

  next();
};

// Validar cambio de estado de postulación
const validatePostulationStatus = (req, res, next) => {
  const { estado, comentarios } = req.body;
  const errors = [];

  // Validar estado
  if (!estado || typeof estado !== 'string') {
    errors.push('El estado es requerido');
  } else {
    const validStates = ['pendiente', 'aprobada', 'rechazada'];
    if (!validStates.includes(estado)) {
      errors.push(`Estado inválido. Estados válidos: ${validStates.join(', ')}`);
    }
  }

  // Validar comentarios (opcional)
  if (comentarios !== undefined) {
    if (typeof comentarios !== 'string') {
      errors.push('Los comentarios deben ser texto');
    } else if (comentarios.trim().length > 500) {
      errors.push('Los comentarios no pueden exceder 500 caracteres');
    } else {
      req.body.comentarios = comentarios.trim();
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación en el cambio de estado',
      errors
    });
  }

  next();
};

// =============================================
// VALIDACIÓN DE ALIANZAS (PARTNERS)
// =============================================

// Validar datos de alianza
const validatePartner = (req, res, next) => {
  const { nombre, descripcion, logo_url, sitio_web, activo } = req.body;
  const errors = [];

  // Validar nombre
  if (!nombre || typeof nombre !== 'string') {
    errors.push('El nombre de la alianza es requerido');
  } else if (nombre.trim().length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres');
  } else if (nombre.trim().length > 100) {
    errors.push('El nombre no puede exceder 100 caracteres');
  }

  // Validar descripción
  if (!descripcion || typeof descripcion !== 'string') {
    errors.push('La descripción es requerida');
  } else if (descripcion.trim().length < 10) {
    errors.push('La descripción debe tener al menos 10 caracteres');
  } else if (descripcion.trim().length > 1000) {
    errors.push('La descripción no puede exceder 1000 caracteres');
  }

  // Validar logo_url (opcional)
  if (logo_url !== undefined && logo_url !== null && logo_url !== '') {
    if (typeof logo_url !== 'string') {
      errors.push('La URL del logo debe ser texto');
    } else if (logo_url.trim().length > 500) {
      errors.push('La URL del logo no puede exceder 500 caracteres');
    } else {
      // Validación básica de formato URL
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(logo_url.trim())) {
        errors.push('La URL del logo debe ser una URL válida (http:// o https://)');
      }
    }
  }

  // Validar sitio_web (opcional)
  if (sitio_web !== undefined && sitio_web !== null && sitio_web !== '') {
    if (typeof sitio_web !== 'string') {
      errors.push('El sitio web debe ser texto');
    } else if (sitio_web.trim().length > 200) {
      errors.push('El sitio web no puede exceder 200 caracteres');
    } else {
      // Validación básica de formato URL
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(sitio_web.trim())) {
        errors.push('El sitio web debe ser una URL válida (http:// o https://)');
      }
    }
  }

  // Validar activo (opcional)
  if (activo !== undefined && typeof activo !== 'boolean') {
    errors.push('El campo activo debe ser verdadero o falso');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación en la alianza',
      errors
    });
  }

  // Limpiar datos
  req.body.nombre = nombre.trim();
  req.body.descripcion = descripcion.trim();
  if (logo_url) req.body.logo_url = logo_url.trim();
  if (sitio_web) req.body.sitio_web = sitio_web.trim();

  next();
};

// Validar parámetros de paginación para alianzas
const validatePartnerPagination = (req, res, next) => {
  const { page, limit, activo, nombre, descripcion, fecha_desde, fecha_hasta } = req.query;
  const errors = [];

  // Validar page
  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('El parámetro page debe ser un número entero mayor a 0');
    } else {
      req.query.page = pageNum;
    }
  }

  // Validar limit
  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      errors.push('El parámetro limit debe ser un número entero entre 1 y 100');
    } else {
      req.query.limit = limitNum;
    }
  }

  // Validar activo
  if (activo !== undefined) {
    if (activo !== 'true' && activo !== 'false') {
      errors.push('El parámetro activo debe ser true o false');
    } else {
      req.query.activo = activo === 'true';
    }
  }

  // Validar nombre
  if (nombre !== undefined) {
    if (typeof nombre !== 'string' || nombre.trim().length === 0) {
      errors.push('El filtro de nombre debe ser un texto válido');
    } else {
      req.query.nombre = nombre.trim();
    }
  }

  // Validar descripción
  if (descripcion !== undefined) {
    if (typeof descripcion !== 'string' || descripcion.trim().length === 0) {
      errors.push('El filtro de descripción debe ser un texto válido');
    } else {
      req.query.descripcion = descripcion.trim();
    }
  }

  // Validar fechas
  if (fecha_desde !== undefined) {
    const date = new Date(fecha_desde);
    if (isNaN(date.getTime())) {
      errors.push('La fecha desde debe ser una fecha válida (YYYY-MM-DD)');
    }
  }

  if (fecha_hasta !== undefined) {
    const date = new Date(fecha_hasta);
    if (isNaN(date.getTime())) {
      errors.push('La fecha hasta debe ser una fecha válida (YYYY-MM-DD)');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación en parámetros de filtros',
      errors
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateGoogleToken,
  validateEvent,
  validateEventUpdate,
  validateEventFilters,
  validateProfile,
  validateInscriptionPagination,
  validateEventId,
  validatePostulation,
  validatePostulationPagination,
  validatePostulationStatus,
  validatePartner,
  validatePartnerPagination
};