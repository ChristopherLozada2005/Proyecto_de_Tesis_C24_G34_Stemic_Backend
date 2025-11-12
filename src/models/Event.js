const { query, getClient } = require('../config/database');

class Event {
  constructor(eventData) {
    this.id = eventData.id;
    this.titulo = eventData.titulo;
    this.descripcion = eventData.descripcion;
    this.fecha_aplicacion_prioritaria = eventData.fecha_aplicacion_prioritaria;
    this.fecha_aplicacion_general = eventData.fecha_aplicacion_general;
    this.duracion = eventData.duracion;
    this.correo_contacto = eventData.correo_contacto;
    this.informacion_adicional = eventData.informacion_adicional;
    // Skills y tags: convertir string tipo '{tag1,tag2}' a array si es necesario
    this.skills = Array.isArray(eventData.skills)
      ? eventData.skills
      : (typeof eventData.skills === 'string' && eventData.skills.startsWith('{'))
        ? eventData.skills.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean)
        : [];
    this.tags = Array.isArray(eventData.tags)
      ? eventData.tags
      : (typeof eventData.tags === 'string' && eventData.tags.startsWith('{'))
        ? eventData.tags.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean)
        : [];
    this.modalidad = eventData.modalidad;
    this.lugar = eventData.lugar;
    this.fecha_hora = eventData.fecha_hora;
    this.imagen_url = eventData.imagen_url;
    this.requiere_postulacion = eventData.requiere_postulacion || false;
    this.allow_custom_form = eventData.allow_custom_form || false;
    this.postulation_schema = eventData.postulation_schema || null;
    this.postulation_schema_version = eventData.postulation_schema_version || 1;
    this.activo = eventData.activo !== undefined ? eventData.activo : true;
    this.created_by = eventData.created_by;
    this.created_at = eventData.created_at;
    this.updated_at = eventData.updated_at;
  }

  // Crear un nuevo evento
  static async create(eventData) {
    const {
      titulo,
      descripcion,
      fecha_aplicacion_prioritaria,
      fecha_aplicacion_general,
      duracion,
      correo_contacto,
      informacion_adicional,
      skills,
      tags,
      modalidad,
      lugar,
      fecha_hora,
      imagen_url,
      requiere_postulacion = false,
      allow_custom_form = false,
      postulation_schema = null,
      postulation_schema_version = 1,
      created_by
    } = eventData;

    // Validar que la modalidad presencial o híbrida tenga lugar
    if ((modalidad === 'presencial' || modalidad === 'hibrido') && !lugar) {
      throw new Error('El lugar es requerido para eventos presenciales e híbridos');
    }

    const queryText = `
      INSERT INTO eventos (
        titulo, descripcion, fecha_aplicacion_prioritaria, fecha_aplicacion_general,
        duracion, correo_contacto, informacion_adicional, skills, tags,
        modalidad, lugar, fecha_hora, imagen_url, requiere_postulacion, allow_custom_form, postulation_schema, postulation_schema_version, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::skill_evento[], $9::tag_evento[], $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    // Skills y tags son arrays
    const skillsArray = Array.isArray(skills) ? skills : [];
    const tagsArray = Array.isArray(tags) ? tags : [];

    const values = [
      titulo,
      descripcion,
      fecha_aplicacion_prioritaria,
      fecha_aplicacion_general,
      duracion,
      correo_contacto,
      informacion_adicional,
      skillsArray,
      tagsArray,
      modalidad,
      lugar,
      fecha_hora,
      imagen_url,
      requiere_postulacion,
      allow_custom_form,
      postulation_schema,
      postulation_schema_version,
      created_by
    ];

    const result = await query(queryText, values);
    return new Event(result.rows[0]);
  }

  // Obtener todos los eventos con filtros opcionales
  static async findAll(filters = {}) {
    let queryText = `
      SELECT e.*, u.nombre as created_by_name
      FROM eventos e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.activo = true
    `;
    const values = [];
    let paramCounter = 1;

    // Aplicar filtros
    if (filters.modalidad) {
      queryText += ` AND e.modalidad = $${paramCounter}`;
      values.push(filters.modalidad);
      paramCounter++;
    }

    if (filters.skills && filters.skills.length > 0) {
      queryText += ` AND e.skills && $${paramCounter}::skill_evento[]`;
      values.push(filters.skills);
      paramCounter++;
    }

    if (filters.tags && filters.tags.length > 0) {
      queryText += ` AND e.tags && $${paramCounter}::tag_evento[]`;
      values.push(filters.tags);
      paramCounter++;
    }

    if (filters.fecha_desde) {
      queryText += ` AND e.fecha_hora >= $${paramCounter}`;
      values.push(filters.fecha_desde);
      paramCounter++;
    }

    if (filters.fecha_hasta) {
      queryText += ` AND e.fecha_hora <= $${paramCounter}`;
      values.push(filters.fecha_hasta);
      paramCounter++;
    }

    if (filters.requiere_postulacion !== undefined) {
      queryText += ` AND e.requiere_postulacion = $${paramCounter}`;
      values.push(filters.requiere_postulacion);
      paramCounter++;
    }

    if (filters.search) {
      queryText += ` AND (
        e.titulo ILIKE $${paramCounter} OR 
        e.descripcion ILIKE $${paramCounter} OR
        e.informacion_adicional ILIKE $${paramCounter}
      )`;
      values.push(`%${filters.search}%`);
      paramCounter++;
    }

    // Ordenar por fecha del evento
    queryText += ` ORDER BY e.fecha_hora ASC`;

    // Paginación
    if (filters.limit) {
      queryText += ` LIMIT $${paramCounter}`;
      values.push(filters.limit);
      paramCounter++;
    }

    if (filters.offset) {
      queryText += ` OFFSET $${paramCounter}`;
      values.push(filters.offset);
      paramCounter++;
    }

    const result = await query(queryText, values);
    return result.rows.map(row => new Event(row));
  }

  // Obtener evento por ID
  static async findById(id) {
    const queryText = `
      SELECT e.*, u.nombre as created_by_name
      FROM eventos e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = $1 AND e.activo = true
    `;
    const result = await query(queryText, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new Event(result.rows[0]);
  }

  // Obtener eventos creados por un usuario específico
  static async findByCreator(userId, filters = {}) {
    let queryText = `
      SELECT e.*, u.nombre as created_by_name
      FROM eventos e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.created_by = $1
    `;
    const values = [userId];
    let paramCounter = 2;

    // Incluir eventos inactivos si se especifica
    if (!filters.includeInactive) {
      queryText += ` AND e.activo = true`;
    }

    queryText += ` ORDER BY e.created_at DESC`;

    const result = await query(queryText, values);
    return result.rows.map(row => new Event(row));
  }

  // Actualizar evento
  static async update(id, eventData, userId = null) {
    // Primero verificar que el evento existe
    const existingEvent = await Event.findById(id);
    if (!existingEvent) {
      throw new Error('Evento no encontrado');
    }

    // Los permisos de rol ya se validaron en el middleware requireOrganizadorOrAdmin
    // Cualquier organizador o admin puede actualizar cualquier evento

    const updateFields = [];
    const values = [];
    let paramCounter = 1;

    // Construir query dinámicamente basado en campos proporcionados
    const allowedFields = [
      'titulo', 'descripcion', 'fecha_aplicacion_prioritaria', 'fecha_aplicacion_general',
      'duracion', 'correo_contacto', 'informacion_adicional', 'skills', 'tags',
      'modalidad', 'lugar', 'fecha_hora', 'imagen_url', 'requiere_postulacion',
      'allow_custom_form', 'postulation_schema', 'postulation_schema_version'
    ];

    for (const field of allowedFields) {
      if (eventData[field] !== undefined) {
        if (field === 'skills') {
          updateFields.push(`skills = $${paramCounter}::skill_evento[]`);
        } else if (field === 'tags') {
          updateFields.push(`tags = $${paramCounter}::tag_evento[]`);
        } else {
          updateFields.push(`${field} = $${paramCounter}`);
        }
        values.push(eventData[field]);
        paramCounter++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No hay campos válidos para actualizar');
    }

    // Validar modalidad y lugar
    if ((eventData.modalidad === 'presencial' || eventData.modalidad === 'hibrido') && 
        !eventData.lugar && !existingEvent.lugar) {
      throw new Error('El lugar es requerido para eventos presenciales e híbridos');
    }

    values.push(id); // Para el WHERE clause
    
    const queryText = `
      UPDATE eventos 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter} AND activo = true
      RETURNING *
    `;

    const result = await query(queryText, values);
    
    if (result.rows.length === 0) {
      throw new Error('Evento no encontrado o no autorizado');
    }

    return new Event(result.rows[0]);
  }

  // Eliminar evento (soft delete)
  static async delete(id, userId = null) {
    const existingEvent = await Event.findById(id);
    if (!existingEvent) {
      throw new Error('Evento no encontrado');
    }

    // Los permisos de rol ya se validaron en el middleware requireOrganizadorOrAdmin
    // Cualquier organizador o admin puede eliminar cualquier evento

    const queryText = `
      UPDATE eventos 
      SET activo = false 
      WHERE id = $1
      RETURNING id
    `;

    const result = await query(queryText, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Evento no encontrado');
    }

    return { id: result.rows[0].id, deleted: true };
  }

  // Obtener estadísticas de eventos
  static async getStats(userId = null) {
    let queryText = `
      SELECT 
        COUNT(*) as total_eventos,
        COUNT(CASE WHEN modalidad = 'virtual' THEN 1 END) as virtuales,
        COUNT(CASE WHEN modalidad = 'presencial' THEN 1 END) as presenciales,
        COUNT(CASE WHEN modalidad = 'hibrido' THEN 1 END) as hibridos,
        COUNT(CASE WHEN requiere_postulacion = true THEN 1 END) as con_postulacion,
        COUNT(CASE WHEN fecha_hora > NOW() THEN 1 END) as futuros,
        COUNT(CASE WHEN fecha_hora <= NOW() THEN 1 END) as pasados
      FROM eventos 
      WHERE activo = true
    `;

    const values = [];
    if (userId) {
      queryText += ` AND created_by = $1`;
      values.push(userId);
    }

    const result = await query(queryText, values);
    return result.rows[0];
  }

  // Obtener próximos eventos (para dashboard)
  static async getUpcomingEvents(limit = 5) {
    const queryText = `
      SELECT e.*, u.nombre as created_by_name
      FROM eventos e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.activo = true AND e.fecha_hora > NOW()
      ORDER BY e.fecha_hora ASC
      LIMIT $1
    `;

    const result = await query(queryText, [limit]);
    return result.rows.map(row => new Event(row));
  }

  // Obtener eventos finalizados (para evaluaciones)
  static async getFinishedEvents(limit = 10) {
    const queryText = `
      SELECT e.*, u.nombre as created_by_name
      FROM eventos e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.activo = true AND e.fecha_hora <= NOW()
      ORDER BY e.fecha_hora DESC
      LIMIT $1
    `;

    const result = await query(queryText, [limit]);
    return result.rows.map(row => new Event(row));
  }

  // Verificar si un evento ha finalizado
  isFinished() {
    const now = new Date();
    const eventDate = new Date(this.fecha_hora);
    return eventDate <= now;
  }

  // Obtener eventos finalizados por usuario (para mostrar en perfil)
  static async getFinishedEventsByUser(userId, limit = 10) {
    const queryText = `
      SELECT DISTINCT e.*, u.nombre as created_by_name
      FROM eventos e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN inscriptions i ON e.id = i.event_id
      WHERE e.activo = true 
        AND e.fecha_hora <= NOW()
        AND (e.created_by = $1 OR i.user_id = $1)
      ORDER BY e.fecha_hora DESC
      LIMIT $2
    `;

    const result = await query(queryText, [userId, limit]);
    return result.rows.map(row => new Event(row));
  }

  // Verificar si un usuario puede editar el evento
  canEdit(userId) {
    return this.created_by === userId;
  }

  // Skills ahora se almacenan sin conversión, retornar tal como están
  _convertSkillsToDisplayValues(skills) {
    // Verificar que skills sea un array válido
    if (!skills || !Array.isArray(skills)) {
      return [];
    }
    
    return skills;
  }

  _convertTagsToDisplayValues(tags) {
    const tagsMapping = {
      'ia': 'IA',
      'tech': 'TECH',
      'networking': 'NETWORKING'
    };
    
    // Verificar que tags sea un array válido
    if (!tags || !Array.isArray(tags)) {
      return [];
    }
    
    return tags.map(tag => tagsMapping[tag] || tag);
  }

  // Método para convertir a JSON (excluyendo campos sensibles)
  toJSON() {
    return {
      id: this.id,
      titulo: this.titulo,
      descripcion: this.descripcion,
      fecha_aplicacion_prioritaria: this.fecha_aplicacion_prioritaria,
      fecha_aplicacion_general: this.fecha_aplicacion_general,
      duracion: this.duracion,
      correo_contacto: this.correo_contacto,
      informacion_adicional: this.informacion_adicional,
      skills: this._convertSkillsToDisplayValues(this.skills),
      tags: this._convertTagsToDisplayValues(this.tags),
      modalidad: this.modalidad,
      lugar: this.lugar,
      fecha_hora: this.fecha_hora,
      imagen_url: this.imagen_url,
      requiere_postulacion: this.requiere_postulacion,
      allow_custom_form: this.allow_custom_form,
      postulation_schema: this.postulation_schema,
      postulation_schema_version: this.postulation_schema_version,
      activo: this.activo,
      created_by: this.created_by,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Método para obtener datos públicos (sin información del creador)
  toPublicJSON() {
    return {
      id: this.id,
      titulo: this.titulo,
      descripcion: this.descripcion,
      fecha_aplicacion_prioritaria: this.fecha_aplicacion_prioritaria,
      fecha_aplicacion_general: this.fecha_aplicacion_general,
      duracion: this.duracion,
      correo_contacto: this.correo_contacto,
      informacion_adicional: this.informacion_adicional,
      skills: this._convertSkillsToDisplayValues(this.skills),
      tags: this._convertTagsToDisplayValues(this.tags),
      modalidad: this.modalidad,
      lugar: this.lugar,
      fecha_hora: this.fecha_hora,
      imagen_url: this.imagen_url,
      requiere_postulacion: this.requiere_postulacion,
      allow_custom_form: this.allow_custom_form,
      created_at: this.created_at
    };
  }

  static async getPostulationForm(eventId) {
    const queryText = `
      SELECT id, allow_custom_form, postulation_schema, postulation_schema_version
      FROM eventos
      WHERE id = $1 AND activo = true
    `;

    const result = await query(queryText, [eventId]);
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  static async savePostulationForm(eventId, { schema, allowCustomForm = true }) {
    const queryText = `
      UPDATE eventos
      SET allow_custom_form = $1,
          postulation_schema = $2,
          postulation_schema_version = COALESCE(postulation_schema_version, 1) + 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, allow_custom_form, postulation_schema, postulation_schema_version
    `;

    const result = await query(queryText, [allowCustomForm, schema, eventId]);
    if (result.rows.length === 0) {
      throw new Error('Evento no encontrado');
    }

    return result.rows[0];
  }
}

module.exports = Event;
