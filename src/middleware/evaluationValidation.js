// Middleware de validación para evaluaciones
const validateEvaluation = (req, res, next) => {
  const { evento_id, respuestas } = req.body;

  // Validar que se proporcionen los datos requeridos
  if (!evento_id) {
    return res.status(400).json({
      success: false,
      message: 'evento_id es requerido'
    });
  }

  if (!respuestas || typeof respuestas !== 'object') {
    return res.status(400).json({
      success: false,
      message: 'respuestas debe ser un objeto'
    });
  }

  // Validar respuestas requeridas (preguntas 1-12)
  const requiredQuestions = [
    'pregunta_1', 'pregunta_2', 'pregunta_3', 'pregunta_4', 
    'pregunta_5', 'pregunta_6', 'pregunta_7', 'pregunta_8', 
    'pregunta_9', 'pregunta_10', 'pregunta_11', 'pregunta_12'
  ];

  for (const questionId of requiredQuestions) {
    if (!respuestas[questionId] || respuestas[questionId] === '') {
      return res.status(400).json({
        success: false,
        message: `La pregunta "${questionId}" es requerida`
      });
    }
    
    // Validar que las respuestas numéricas estén en el rango 1-5
    const value = parseInt(respuestas[questionId]);
    if (isNaN(value) || value < 1 || value > 5) {
      return res.status(400).json({
        success: false,
        message: `La respuesta para "${questionId}" debe ser un número entre 1 y 5`
      });
    }
  }

  // Validar respuestas opcionales (preguntas 13-15)
  const optionalQuestions = ['pregunta_13', 'pregunta_14', 'pregunta_15'];
  
  for (const questionId of optionalQuestions) {
    if (respuestas[questionId] && typeof respuestas[questionId] !== 'string') {
      return res.status(400).json({
        success: false,
        message: `La respuesta para "${questionId}" debe ser texto`
      });
    }
    
    // Validar longitud máxima para respuestas de texto (opcional)
    if (respuestas[questionId] && respuestas[questionId].length > 1000) {
      return res.status(400).json({
        success: false,
        message: `La respuesta para "${questionId}" no puede exceder 1000 caracteres`
      });
    }
  }

  // Validar que no haya preguntas adicionales no permitidas
  const allowedQuestions = [
    'pregunta_1', 'pregunta_2', 'pregunta_3', 'pregunta_4', 'pregunta_5',
    'pregunta_6', 'pregunta_7', 'pregunta_8', 'pregunta_9', 'pregunta_10',
    'pregunta_11', 'pregunta_12', 'pregunta_13', 'pregunta_14', 'pregunta_15'
  ];

  const providedQuestions = Object.keys(respuestas);
  const invalidQuestions = providedQuestions.filter(q => !allowedQuestions.includes(q));
  
  if (invalidQuestions.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Preguntas no permitidas: ${invalidQuestions.join(', ')}`
    });
  }

  next();
};

// Middleware para validar que el evento existe y puede ser evaluado
const validateEventForEvaluation = async (req, res, next) => {
  try {
    const { evento_id } = req.params;
    const Event = require('../models/Event');

    if (!evento_id) {
      return res.status(400).json({
        success: false,
        message: 'evento_id es requerido'
      });
    }

    // Verificar que el evento existe
    const evento = await Event.findById(evento_id);
    if (!evento) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }

    // Verificar que el evento ya haya finalizado
    if (!evento.isFinished()) {
      return res.status(400).json({
        success: false,
        message: 'El evento aún no ha finalizado'
      });
    }

    // Agregar el evento al request para uso posterior
    req.evento = evento;
    next();
  } catch (error) {
    console.error('Error en validación de evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware para validar que el usuario no haya evaluado ya el evento
const validateUserHasNotEvaluated = async (req, res, next) => {
  try {
    const { evento_id } = req.params;
    const usuario_id = req.user.id;
    const Evaluation = require('../models/Evaluation');

    // Verificar si ya evaluó
    const existingEvaluation = await Evaluation.findByUserAndEvent(usuario_id, evento_id);
    if (existingEvaluation) {
      return res.status(409).json({
        success: false,
        message: 'Ya has evaluado este evento'
      });
    }

    next();
  } catch (error) {
    console.error('Error en validación de evaluación existente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  validateEvaluation,
  validateEventForEvaluation,
  validateUserHasNotEvaluated
};
