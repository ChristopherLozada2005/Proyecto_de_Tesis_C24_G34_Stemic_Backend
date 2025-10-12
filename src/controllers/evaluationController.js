const Evaluation = require('../models/Evaluation');
const Event = require('../models/Event');

// Obtener las preguntas de evaluación predefinidas
const getEvaluationQuestions = async (req, res) => {
  try {
    const questions = [
      {
        id: 'pregunta_1',
        pregunta: '¿Cómo calificarías este evento en general?',
        tipo: 'escala',
        opciones: [
          { valor: 1, texto: 'Muy malo' },
          { valor: 2, texto: 'Malo' },
          { valor: 3, texto: 'Regular' },
          { valor: 4, texto: 'Bueno' },
          { valor: 5, texto: 'Excelente' }
        ],
        requerida: true
      },
      {
        id: 'pregunta_2',
        pregunta: '¿El evento cumplió con tus expectativas?',
        tipo: 'escala',
        opciones: [
          { valor: 1, texto: 'Para nada' },
          { valor: 2, texto: 'Poco' },
          { valor: 3, texto: 'Regular' },
          { valor: 4, texto: 'Bastante' },
          { valor: 5, texto: 'Completamente' }
        ],
        requerida: true
      },
      {
        id: 'pregunta_3',
        pregunta: '¿Qué tan probable es que recomiendes este evento a un compañero?',
        tipo: 'escala',
        opciones: [
          { valor: 1, texto: 'Muy improbable' },
          { valor: 2, texto: 'Improbable' },
          { valor: 3, texto: 'Neutral' },
          { valor: 4, texto: 'Probable' },
          { valor: 5, texto: 'Muy probable' }
        ],
        requerida: true
      },
      {
        id: 'pregunta_4',
        pregunta: '¿Cómo evalúas la calidad del contenido presentado?',
        tipo: 'escala',
        opciones: [
          { valor: 1, texto: 'Muy mala' },
          { valor: 2, texto: 'Mala' },
          { valor: 3, texto: 'Regular' },
          { valor: 4, texto: 'Buena' },
          { valor: 5, texto: 'Excelente' }
        ],
        requerida: true
      },
      {
        id: 'pregunta_5',
        pregunta: '¿Qué tan clara fue la presentación/explicación?',
        tipo: 'escala',
        opciones: [
          { valor: 1, texto: 'Muy confusa' },
          { valor: 2, texto: 'Confusa' },
          { valor: 3, texto: 'Regular' },
          { valor: 4, texto: 'Clara' },
          { valor: 5, texto: 'Muy clara' }
        ],
        requerida: true
      },
      {
        id: 'pregunta_6',
        pregunta: '¿Qué tan útil consideras este contenido para tu desarrollo académico/profesional?',
        tipo: 'escala',
        opciones: [
          { valor: 1, texto: 'Nada útil' },
          { valor: 2, texto: 'Poco útil' },
          { valor: 3, texto: 'Regular' },
          { valor: 4, texto: 'Útil' },
          { valor: 5, texto: 'Muy útil' }
        ],
        requerida: true
      },
      {
        id: 'pregunta_7',
        pregunta: '¿Cómo calificas la organización y logística del evento?',
        tipo: 'escala',
        opciones: [
          { valor: 1, texto: 'Muy mala' },
          { valor: 2, texto: 'Mala' },
          { valor: 3, texto: 'Regular' },
          { valor: 4, texto: 'Buena' },
          { valor: 5, texto: 'Excelente' }
        ],
        requerida: true
      },
      {
        id: 'pregunta_8',
        pregunta: '¿Cuánto sientes que aprendiste en este evento?',
        tipo: 'escala',
        opciones: [
          { valor: 1, texto: 'Nada' },
          { valor: 2, texto: 'Poco' },
          { valor: 3, texto: 'Regular' },
          { valor: 4, texto: 'Bastante' },
          { valor: 5, texto: 'Mucho' }
        ],
        requerida: true
      },
      {
        id: 'pregunta_9',
        pregunta: '¿Qué habilidades sientes que desarrollaste o reforzaste?',
        tipo: 'escala',
        opciones: [
          { valor: 1, texto: 'Ninguna' },
          { valor: 2, texto: 'Pocas' },
          { valor: 3, texto: 'Algunas' },
          { valor: 4, texto: 'Bastantes' },
          { valor: 5, texto: 'Muchas' }
        ],
        requerida: true
      },
      {
        id: 'pregunta_10',
        pregunta: '¿Planeas aplicar lo aprendido en tus estudios o proyectos?',
        tipo: 'escala',
        opciones: [
          { valor: 1, texto: 'Definitivamente no' },
          { valor: 2, texto: 'Probablemente no' },
          { valor: 3, texto: 'No estoy seguro' },
          { valor: 4, texto: 'Probablemente sí' },
          { valor: 5, texto: 'Definitivamente sí' }
        ],
        requerida: true
      },
      {
        id: 'pregunta_11',
        pregunta: 'Después de este evento, ¿qué tan motivado te sientes para participar en más actividades STEM?',
        tipo: 'escala',
        opciones: [
          { valor: 1, texto: 'Nada motivado' },
          { valor: 2, texto: 'Poco motivado' },
          { valor: 3, texto: 'Neutral' },
          { valor: 4, texto: 'Motivado' },
          { valor: 5, texto: 'Muy motivado' }
        ],
        requerida: true
      },
      {
        id: 'pregunta_12',
        pregunta: '¿Te interesaría participar en eventos similares organizados por esta organización?',
        tipo: 'escala',
        opciones: [
          { valor: 1, texto: 'Definitivamente no' },
          { valor: 2, texto: 'Probablemente no' },
          { valor: 3, texto: 'No estoy seguro' },
          { valor: 4, texto: 'Probablemente sí' },
          { valor: 5, texto: 'Definitivamente sí' }
        ],
        requerida: true
      },
      {
        id: 'pregunta_13',
        pregunta: '¿Qué fue lo que más te gustó del evento?',
        tipo: 'texto',
        requerida: false,
        placeholder: 'Describe lo que más te gustó del evento...'
      },
      {
        id: 'pregunta_14',
        pregunta: '¿Qué aspectos consideras que se podrían mejorar?',
        tipo: 'texto',
        requerida: false,
        placeholder: 'Menciona los aspectos que crees que se podrían mejorar...'
      },
      {
        id: 'pregunta_15',
        pregunta: '¿Tienes alguna sugerencia para futuros eventos?',
        tipo: 'texto',
        requerida: false,
        placeholder: 'Comparte tus sugerencias para futuros eventos...'
      }
    ];

    res.json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error('Error al obtener preguntas de evaluación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Crear una nueva evaluación
const createEvaluation = async (req, res) => {
  try {
    const { evento_id, respuestas } = req.body;
    const usuario_id = req.user.id;

    // Validar que se proporcionen los datos requeridos
    if (!evento_id || !respuestas) {
      return res.status(400).json({
        success: false,
        message: 'evento_id y respuestas son requeridos'
      });
    }

    // Validar que el evento existe
    const evento = await Event.findById(evento_id);
    if (!evento) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }

    // Verificar que el evento ya haya finalizado
    const now = new Date();
    const eventDate = new Date(evento.fecha_hora);
    if (eventDate > now) {
      return res.status(400).json({
        success: false,
        message: 'El evento aún no ha finalizado'
      });
    }

    // Validar respuestas requeridas (preguntas 1-12)
    const requiredQuestions = ['pregunta_1', 'pregunta_2', 'pregunta_3', 'pregunta_4', 'pregunta_5', 'pregunta_6', 'pregunta_7', 'pregunta_8', 'pregunta_9', 'pregunta_10', 'pregunta_11', 'pregunta_12'];
    
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

    // Crear la evaluación
    const evaluation = await Evaluation.create({
      evento_id,
      usuario_id,
      respuestas
    });

    res.status(201).json({
      success: true,
      message: 'Evaluación creada exitosamente',
      data: evaluation.toJSON()
    });
  } catch (error) {
    console.error('Error al crear evaluación:', error);
    
    if (error.message === 'Ya has evaluado este evento') {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message === 'El evento aún no ha finalizado') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener evaluaciones de un usuario
const getUserEvaluations = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const evaluations = await Evaluation.findByUser(usuario_id);

    res.json({
      success: true,
      data: evaluations.map(eval => eval.toJSON())
    });
  } catch (error) {
    console.error('Error al obtener evaluaciones del usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener evaluaciones de un evento (solo para creadores del evento)
const getEventEvaluations = async (req, res) => {
  try {
    const { evento_id } = req.params;
    const usuario_id = req.user.id;

    // Verificar que el usuario es el creador del evento
    const evento = await Event.findById(evento_id);
    if (!evento) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }

    if (evento.created_by !== usuario_id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver las evaluaciones de este evento'
      });
    }

    const evaluations = await Evaluation.findByEvent(evento_id);

    res.json({
      success: true,
      data: evaluations.map(eval => eval.toJSON())
    });
  } catch (error) {
    console.error('Error al obtener evaluaciones del evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Obtener estadísticas de evaluaciones de un evento
const getEventStats = async (req, res) => {
  try {
    const { evento_id } = req.params;
    const usuario_id = req.user.id;

    // Verificar que el usuario es el creador del evento
    const evento = await Event.findById(evento_id);
    if (!evento) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }

    if (evento.created_by !== usuario_id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver las estadísticas de este evento'
      });
    }

    const stats = await Evaluation.getEventStats(evento_id);
    const openResponses = await Evaluation.getOpenResponses(evento_id);

    res.json({
      success: true,
      data: {
        estadisticas: stats,
        respuestas_abiertas: openResponses
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas del evento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Verificar si un usuario puede evaluar un evento
const canEvaluateEvent = async (req, res) => {
  try {
    const { evento_id } = req.params;
    const usuario_id = req.user.id;

    // Verificar que el evento existe
    const evento = await Event.findById(evento_id);
    if (!evento) {
      return res.status(404).json({
        success: false,
        message: 'Evento no encontrado'
      });
    }

    // Verificar que el evento ya haya finalizado
    const now = new Date();
    const eventDate = new Date(evento.fecha_hora);
    const canEvaluate = eventDate <= now;

    // Verificar si ya evaluó
    const existingEvaluation = await Evaluation.findByUserAndEvent(usuario_id, evento_id);
    const alreadyEvaluated = !!existingEvaluation;

    res.json({
      success: true,
      data: {
        puede_evaluar: canEvaluate && !alreadyEvaluated,
        evento_finalizado: canEvaluate,
        ya_evaluado: alreadyEvaluated,
        evento: {
          id: evento.id,
          titulo: evento.titulo,
          fecha_hora: evento.fecha_hora
        }
      }
    });
  } catch (error) {
    console.error('Error al verificar si puede evaluar:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

module.exports = {
  getEvaluationQuestions,
  createEvaluation,
  getUserEvaluations,
  getEventEvaluations,
  getEventStats,
  canEvaluateEvent
};
