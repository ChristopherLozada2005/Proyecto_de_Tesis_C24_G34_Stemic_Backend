// Validaciones para reportes
const validateReportFilters = (req, res, next) => {
  const { evento_id, fecha_desde, fecha_hasta, modalidad } = req.query;
  const errors = [];

  // Validar evento_id si se proporciona
  if (evento_id !== undefined) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(evento_id)) {
      errors.push('ID de evento inválido');
    }
  }

  // Validar fecha_desde si se proporciona
  if (fecha_desde !== undefined) {
    const date = new Date(fecha_desde);
    if (isNaN(date.getTime())) {
      errors.push('Formato de fecha_desde inválido (use YYYY-MM-DD)');
    }
  }

  // Validar fecha_hasta si se proporciona
  if (fecha_hasta !== undefined) {
    const date = new Date(fecha_hasta);
    if (isNaN(date.getTime())) {
      errors.push('Formato de fecha_hasta inválido (use YYYY-MM-DD)');
    }
  }

  // Validar que fecha_hasta sea posterior a fecha_desde
  if (fecha_desde && fecha_hasta) {
    const fechaDesde = new Date(fecha_desde);
    const fechaHasta = new Date(fecha_hasta);
    
    if (fechaHasta < fechaDesde) {
      errors.push('La fecha_hasta debe ser posterior o igual a fecha_desde');
    }
  }

  // Validar modalidad si se proporciona
  if (modalidad !== undefined) {
    const modalidadesValidas = ['virtual', 'presencial', 'hibrido'];
    if (!modalidadesValidas.includes(modalidad)) {
      errors.push('Modalidad inválida. Debe ser: virtual, presencial o hibrido');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación en filtros de reporte',
      errors
    });
  }

  next();
};

module.exports = {
  validateReportFilters
};
