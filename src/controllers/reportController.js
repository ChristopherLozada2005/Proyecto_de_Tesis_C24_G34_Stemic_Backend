const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');
const { query } = require('../config/database');
const Event = require('../models/Event');
const Evaluation = require('../models/Evaluation');
const ReportGeneration = require('../models/ReportGeneration');
const ReportDataCache = require('../models/ReportDataCache');

class ReportController {
  // =============================================
  // REPORTES DE PARTICIPACIÓN
  // =============================================

  // Obtener datos de participación para reportes
  static async getParticipationData(filters = {}) {
    let queryText = `
      SELECT 
        e.id as evento_id,
        e.titulo as evento_titulo,
        e.fecha_hora as evento_fecha,
        e.modalidad as evento_modalidad,
        e.lugar as evento_lugar,
        i.id as inscripcion_id,
        i.created_at as fecha_inscripcion,
        u.id as usuario_id,
        u.nombre as nombre_completo,
        u.correo as correo,
        p.phone_number as telefono,
        CASE 
          WHEN u.rol IN ('organizador', 'admin') THEN 'Sí'
          ELSE 'No'
        END as pertenece_organizacion,
        u.rol as rol_usuario
      FROM eventos e
      LEFT JOIN inscriptions i ON e.id = i.event_id
      LEFT JOIN users u ON i.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE e.activo = true
    `;
    
    const values = [];
    let paramCounter = 1;

    // Aplicar filtros
    if (filters.evento_id) {
      queryText += ` AND e.id = $${paramCounter}`;
      values.push(filters.evento_id);
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

    if (filters.modalidad) {
      queryText += ` AND e.modalidad = $${paramCounter}`;
      values.push(filters.modalidad);
      paramCounter++;
    }

    // Ordenar por fecha del evento y nombre del usuario
    queryText += ` ORDER BY e.fecha_hora DESC, u.nombre ASC`;

    const result = await query(queryText, values);
    return result.rows;
  }

  // Generar reporte de participación en Excel
  static async generateParticipationExcel(filters = {}) {
    const data = await ReportController.getParticipationData(filters);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Participación');

    // Configurar columnas
    worksheet.columns = [
      { header: 'FECHA', key: 'fecha', width: 12 },
      { header: 'EVENTO', key: 'evento', width: 30 },
      { header: 'ID ASISTENTE', key: 'id_asistente', width: 15 },
      { header: 'NOMBRE COMPLETO', key: 'nombre_completo', width: 25 },
      { header: 'TELÉFONO', key: 'telefono', width: 15 },
      { header: 'CORREO', key: 'correo', width: 30 },
      { header: '¿PERTENECE A LA ORGANIZACIÓN?', key: 'pertenece_organizacion', width: 25 },
      { header: 'MODALIDAD', key: 'modalidad', width: 15 },
      { header: 'LUGAR', key: 'lugar', width: 25 }
    ];

    // Estilo para encabezados
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2E86AB' }
    };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Agregar datos
    data.forEach(row => {
      worksheet.addRow({
        fecha: new Date(row.evento_fecha).toLocaleDateString('es-ES'),
        evento: row.evento_titulo,
        id_asistente: row.usuario_id,
        nombre_completo: row.nombre_completo || 'N/A',
        telefono: row.telefono || 'N/A',
        correo: row.correo || 'N/A',
        pertenece_organizacion: row.pertenece_organizacion,
        modalidad: row.evento_modalidad,
        lugar: row.evento_lugar || 'N/A'
      });
    });

    // Aplicar bordes a todas las celdas
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle' };
      });
    });

    // Ajustar altura de filas
    worksheet.eachRow((row, rowNumber) => {
      row.height = 20;
    });

    return workbook;
  }

  // Generar reporte de participación en PDF
  static async generateParticipationPDF(filters = {}) {
    const data = await ReportController.getParticipationData(filters);
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Crear HTML para el PDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte de Participación</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { color: #2E86AB; font-size: 24px; font-weight: bold; margin-bottom: 10px; }
          .subtitle { color: #666; font-size: 16px; }
          .info { margin-bottom: 20px; font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #2E86AB; color: white; padding: 12px 8px; text-align: left; font-weight: bold; }
          td { padding: 10px 8px; border: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">REPORTE DE PARTICIPACIÓN</div>
          <div class="subtitle">Listado detallado de asistentes por eventos</div>
        </div>
        
        <div class="info">
          <strong>Fecha de generación:</strong> ${new Date().toLocaleString('es-ES')}<br>
          <strong>Total de registros:</strong> ${data.length}
        </div>

        <table>
          <thead>
            <tr>
              <th>FECHA</th>
              <th>EVENTO</th>
              <th>ID ASISTENTE</th>
              <th>NOMBRE COMPLETO</th>
              <th>TELÉFONO</th>
              <th>CORREO</th>
              <th>¿PERTENECE A LA ORGANIZACIÓN?</th>
              <th>MODALIDAD</th>
              <th>LUGAR</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                <td>${new Date(row.evento_fecha).toLocaleDateString('es-ES')}</td>
                <td>${row.evento_titulo}</td>
                <td>${row.usuario_id}</td>
                <td>${row.nombre_completo || 'N/A'}</td>
                <td>${row.telefono || 'N/A'}</td>
                <td>${row.correo || 'N/A'}</td>
                <td>${row.pertenece_organizacion}</td>
                <td>${row.evento_modalidad}</td>
                <td>${row.evento_lugar || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Generado por STEMIC - Sistema de Gestión de Eventos STEM</p>
        </div>
      </body>
      </html>
    `;

    await page.setContent(html);
    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();
    return pdf;
  }

  // =============================================
  // REPORTES DE SATISFACCIÓN
  // =============================================

  // Obtener datos de satisfacción para reportes
  static async getSatisfactionData(filters = {}) {
    let queryText = `
      SELECT 
        ev.id as evento_id,
        ev.titulo as evento_titulo,
        ev.fecha_hora as evento_fecha,
        e.id as evaluacion_id,
        e.created_at as fecha_evaluacion,
        u.id as usuario_id,
        u.nombre as nombre_completo,
        u.correo as correo,
        e.respuestas
      FROM eventos ev
      INNER JOIN evaluations e ON ev.id = e.evento_id
      INNER JOIN users u ON e.usuario_id = u.id
      WHERE ev.activo = true
    `;
    
    const values = [];
    let paramCounter = 1;

    // Aplicar filtros
    if (filters.evento_id) {
      queryText += ` AND ev.id = $${paramCounter}`;
      values.push(filters.evento_id);
      paramCounter++;
    }

    if (filters.fecha_desde) {
      queryText += ` AND ev.fecha_hora >= $${paramCounter}`;
      values.push(filters.fecha_desde);
      paramCounter++;
    }

    if (filters.fecha_hasta) {
      queryText += ` AND ev.fecha_hora <= $${paramCounter}`;
      values.push(filters.fecha_hasta);
      paramCounter++;
    }

    if (filters.modalidad) {
      queryText += ` AND ev.modalidad = $${paramCounter}`;
      values.push(filters.modalidad);
      paramCounter++;
    }

    // Ordenar por fecha del evento y fecha de evaluación
    queryText += ` ORDER BY ev.fecha_hora DESC, e.created_at DESC`;

    const result = await query(queryText, values);
    return result.rows;
  }

  // Generar reporte de satisfacción en Excel
  static async generateSatisfactionExcel(filters = {}) {
    const data = await ReportController.getSatisfactionData(filters);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Satisfacción');

    // Configurar columnas
    worksheet.columns = [
      { header: 'ID ENCUESTA', key: 'id_encuesta', width: 15 },
      { header: 'EVENTO', key: 'evento', width: 30 },
      { header: 'NOMBRE COMPLETO', key: 'nombre_completo', width: 25 },
      { header: 'CORREO', key: 'correo', width: 30 },
      { header: 'CALIFICACIÓN GENERAL (1-5)', key: 'calificacion_general', width: 25 },
      { header: '¿CUMPLIÓ EXPECTATIVAS? (1-5)', key: 'cumplio_expectativas', width: 25 },
      { header: 'RECOMENDARÍAS (1-5)', key: 'recomendarias', width: 20 },
      { header: 'CALIDAD CONTENIDO (1-5)', key: 'calidad_contenido', width: 25 },
      { header: 'CLARIDAD PRESENTACIÓN (1-5)', key: 'claridad_presentacion', width: 25 },
      { header: 'UTILIDAD CONTENIDO (1-5)', key: 'utilidad_contenido', width: 25 },
      { header: 'ORGANIZACIÓN (1-5)', key: 'organizacion', width: 20 },
      { header: 'APRENDIZAJE (1-5)', key: 'aprendizaje', width: 20 },
      { header: 'DESARROLLO HABILIDADES (1-5)', key: 'desarrollo_habilidades', width: 25 },
      { header: 'APLICACIÓN (1-5)', key: 'aplicacion', width: 20 },
      { header: 'MOTIVACIÓN (1-5)', key: 'motivacion', width: 20 },
      { header: 'INTERÉS FUTURO (1-5)', key: 'interes_futuro', width: 20 },
      { header: 'LO QUE MÁS GUSTÓ', key: 'lo_que_mas_gusto', width: 30 },
      { header: 'ASPECTOS A MEJORAR', key: 'aspectos_mejorar', width: 30 },
      { header: 'SUGERENCIAS', key: 'sugerencias', width: 30 }
    ];

    // Estilo para encabezados
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '2E86AB' }
    };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Agregar datos
    data.forEach(row => {
      const respuestas = typeof row.respuestas === 'string' 
        ? JSON.parse(row.respuestas) 
        : row.respuestas;

      worksheet.addRow({
        id_encuesta: row.evaluacion_id,
        evento: row.evento_titulo,
        nombre_completo: row.nombre_completo || 'N/A',
        correo: row.correo || 'N/A',
        calificacion_general: respuestas.pregunta_1 || 'N/A',
        cumplio_expectativas: respuestas.pregunta_2 || 'N/A',
        recomendarias: respuestas.pregunta_3 || 'N/A',
        calidad_contenido: respuestas.pregunta_4 || 'N/A',
        claridad_presentacion: respuestas.pregunta_5 || 'N/A',
        utilidad_contenido: respuestas.pregunta_6 || 'N/A',
        organizacion: respuestas.pregunta_7 || 'N/A',
        aprendizaje: respuestas.pregunta_8 || 'N/A',
        desarrollo_habilidades: respuestas.pregunta_9 || 'N/A',
        aplicacion: respuestas.pregunta_10 || 'N/A',
        motivacion: respuestas.pregunta_11 || 'N/A',
        interes_futuro: respuestas.pregunta_12 || 'N/A',
        lo_que_mas_gusto: respuestas.pregunta_13 || 'N/A',
        aspectos_mejorar: respuestas.pregunta_14 || 'N/A',
        sugerencias: respuestas.pregunta_15 || 'N/A'
      });
    });

    // Aplicar bordes a todas las celdas
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle' };
      });
    });

    // Ajustar altura de filas
    worksheet.eachRow((row, rowNumber) => {
      row.height = 20;
    });

    return workbook;
  }

  // Generar reporte de satisfacción en PDF
  static async generateSatisfactionPDF(filters = {}) {
    const data = await ReportController.getSatisfactionData(filters);
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Crear HTML para el PDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte de Satisfacción</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; font-size: 10px; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { color: #2E86AB; font-size: 20px; font-weight: bold; margin-bottom: 10px; }
          .subtitle { color: #666; font-size: 14px; }
          .info { margin-bottom: 20px; font-size: 10px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #2E86AB; color: white; padding: 8px 4px; text-align: left; font-weight: bold; font-size: 9px; }
          td { padding: 6px 4px; border: 1px solid #ddd; font-size: 8px; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
          .text-cell { max-width: 200px; word-wrap: break-word; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">REPORTE DE SATISFACCIÓN</div>
          <div class="subtitle">Análisis de respuestas de encuestas con comentarios</div>
        </div>
        
        <div class="info">
          <strong>Fecha de generación:</strong> ${new Date().toLocaleString('es-ES')}<br>
          <strong>Total de evaluaciones:</strong> ${data.length}
        </div>

        <table>
          <thead>
            <tr>
              <th>ID ENCUESTA</th>
              <th>EVENTO</th>
              <th>NOMBRE COMPLETO</th>
              <th>CORREO</th>
              <th>CAL. GENERAL</th>
              <th>EXPECTATIVAS</th>
              <th>RECOMENDARÍAS</th>
              <th>CONTENIDO</th>
              <th>PRESENTACIÓN</th>
              <th>UTILIDAD</th>
              <th>ORGANIZACIÓN</th>
              <th>APRENDIZAJE</th>
              <th>HABILIDADES</th>
              <th>APLICACIÓN</th>
              <th>MOTIVACIÓN</th>
              <th>INTERÉS FUTURO</th>
              <th>LO QUE MÁS GUSTÓ</th>
              <th>MEJORAR</th>
              <th>SUGERENCIAS</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(row => {
              const respuestas = typeof row.respuestas === 'string' 
                ? JSON.parse(row.respuestas) 
                : row.respuestas;
              
              return `
                <tr>
                  <td>${row.evaluacion_id}</td>
                  <td>${row.evento_titulo}</td>
                  <td>${row.nombre_completo || 'N/A'}</td>
                  <td>${row.correo || 'N/A'}</td>
                  <td>${respuestas.pregunta_1 || 'N/A'}</td>
                  <td>${respuestas.pregunta_2 || 'N/A'}</td>
                  <td>${respuestas.pregunta_3 || 'N/A'}</td>
                  <td>${respuestas.pregunta_4 || 'N/A'}</td>
                  <td>${respuestas.pregunta_5 || 'N/A'}</td>
                  <td>${respuestas.pregunta_6 || 'N/A'}</td>
                  <td>${respuestas.pregunta_7 || 'N/A'}</td>
                  <td>${respuestas.pregunta_8 || 'N/A'}</td>
                  <td>${respuestas.pregunta_9 || 'N/A'}</td>
                  <td>${respuestas.pregunta_10 || 'N/A'}</td>
                  <td>${respuestas.pregunta_11 || 'N/A'}</td>
                  <td>${respuestas.pregunta_12 || 'N/A'}</td>
                  <td class="text-cell">${respuestas.pregunta_13 || 'N/A'}</td>
                  <td class="text-cell">${respuestas.pregunta_14 || 'N/A'}</td>
                  <td class="text-cell">${respuestas.pregunta_15 || 'N/A'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Generado por STEMIC - Sistema de Gestión de Eventos STEM</p>
        </div>
      </body>
      </html>
    `;

    await page.setContent(html);
    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      margin: { top: '15px', right: '15px', bottom: '15px', left: '15px' }
    });

    await browser.close();
    return pdf;
  }

  // =============================================
  // ENDPOINTS DEL CONTROLADOR
  // =============================================

  // Obtener datos de participación (para vista previa)
  static async getParticipationDataPreview(req, res) {
    try {
      const filters = {
        evento_id: req.query.evento_id,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        modalidad: req.query.modalidad
      };

      let data;
      let source = 'realtime';

      // Si se especifica un evento específico, intentar usar cache
      if (filters.evento_id) {
        const cacheResult = await ReportDataCache.getReportDataWithFallback(
          filters.evento_id, 
          'participation',
          async (eventoId) => {
            return await ReportController.getParticipationData({ evento_id: eventoId });
          }
        );
        
        data = cacheResult.data;
        source = cacheResult.source;
      } else {
        // Para consultas generales, usar tiempo real
        data = await ReportController.getParticipationData(filters);
      }
      
      res.json({
        success: true,
        data: data,
        meta: {
          total: data.length,
          filters: filters,
          source: source
        }
      });
    } catch (error) {
      console.error('Error al obtener datos de participación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener datos de satisfacción (para vista previa)
  static async getSatisfactionDataPreview(req, res) {
    try {
      const filters = {
        evento_id: req.query.evento_id,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        modalidad: req.query.modalidad
      };

      let data;
      let source = 'realtime';

      // Si se especifica un evento específico, intentar usar cache
      if (filters.evento_id) {
        const cacheResult = await ReportDataCache.getReportDataWithFallback(
          filters.evento_id, 
          'satisfaction',
          async (eventoId) => {
            return await ReportController.getSatisfactionData({ evento_id: eventoId });
          }
        );
        
        data = cacheResult.data;
        source = cacheResult.source;
      } else {
        // Para consultas generales, usar tiempo real
        data = await ReportController.getSatisfactionData(filters);
      }
      
      res.json({
        success: true,
        data: data,
        meta: {
          total: data.length,
          filters: filters,
          source: source
        }
      });
    } catch (error) {
      console.error('Error al obtener datos de satisfacción:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Exportar reporte de participación en Excel
  static async exportParticipationExcel(req, res) {
    const startTime = Date.now();
    let reportGeneration = null;

    try {
      const filters = {
        evento_id: req.query.evento_id,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        modalidad: req.query.modalidad
      };

      const fileName = `reporte_participacion_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Crear registro de generación
      reportGeneration = await ReportGeneration.create({
        user_id: req.user.id,
        report_type: 'participation',
        report_format: 'excel',
        filters: filters,
        file_name: fileName,
        status: 'processing'
      });

      const workbook = await ReportController.generateParticipationExcel(filters);
      
      // Calcular métricas
      const generationTime = Date.now() - startTime;
      const buffer = await workbook.xlsx.writeBuffer();
      const fileSize = buffer.length;

      // Actualizar métricas en la base de datos
      await ReportGeneration.updateMetrics(reportGeneration.id, fileSize, generationTime);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      res.send(buffer);
    } catch (error) {
      console.error('Error al exportar reporte de participación Excel:', error);
      
      // Actualizar estado de error si existe el registro
      if (reportGeneration) {
        await ReportGeneration.updateStatus(reportGeneration.id, 'failed', error.message);
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Exportar reporte de participación en PDF
  static async exportParticipationPDF(req, res) {
    const startTime = Date.now();
    let reportGeneration = null;

    try {
      const filters = {
        evento_id: req.query.evento_id,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        modalidad: req.query.modalidad
      };

      const fileName = `reporte_participacion_${new Date().toISOString().split('T')[0]}.pdf`;

      // Crear registro de generación
      reportGeneration = await ReportGeneration.create({
        user_id: req.user.id,
        report_type: 'participation',
        report_format: 'pdf',
        filters: filters,
        file_name: fileName,
        status: 'processing'
      });

      const pdf = await ReportController.generateParticipationPDF(filters);
      
      // Calcular métricas
      const generationTime = Date.now() - startTime;
      const fileSize = pdf.length;

      // Actualizar métricas en la base de datos
      await ReportGeneration.updateMetrics(reportGeneration.id, fileSize, generationTime);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      res.send(pdf);
    } catch (error) {
      console.error('Error al exportar reporte de participación PDF:', error);
      
      // Actualizar estado de error si existe el registro
      if (reportGeneration) {
        await ReportGeneration.updateStatus(reportGeneration.id, 'failed', error.message);
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Exportar reporte de satisfacción en Excel
  static async exportSatisfactionExcel(req, res) {
    const startTime = Date.now();
    let reportGeneration = null;

    try {
      const filters = {
        evento_id: req.query.evento_id,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        modalidad: req.query.modalidad
      };

      const fileName = `reporte_satisfaccion_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Crear registro de generación
      reportGeneration = await ReportGeneration.create({
        user_id: req.user.id,
        report_type: 'satisfaction',
        report_format: 'excel',
        filters: filters,
        file_name: fileName,
        status: 'processing'
      });

      const workbook = await ReportController.generateSatisfactionExcel(filters);
      
      // Calcular métricas
      const generationTime = Date.now() - startTime;
      const buffer = await workbook.xlsx.writeBuffer();
      const fileSize = buffer.length;

      // Actualizar métricas en la base de datos
      await ReportGeneration.updateMetrics(reportGeneration.id, fileSize, generationTime);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      res.send(buffer);
    } catch (error) {
      console.error('Error al exportar reporte de satisfacción Excel:', error);
      
      // Actualizar estado de error si existe el registro
      if (reportGeneration) {
        await ReportGeneration.updateStatus(reportGeneration.id, 'failed', error.message);
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Exportar reporte de satisfacción en PDF
  static async exportSatisfactionPDF(req, res) {
    const startTime = Date.now();
    let reportGeneration = null;

    try {
      const filters = {
        evento_id: req.query.evento_id,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        modalidad: req.query.modalidad
      };

      const fileName = `reporte_satisfaccion_${new Date().toISOString().split('T')[0]}.pdf`;

      // Crear registro de generación
      reportGeneration = await ReportGeneration.create({
        user_id: req.user.id,
        report_type: 'satisfaction',
        report_format: 'pdf',
        filters: filters,
        file_name: fileName,
        status: 'processing'
      });

      const pdf = await ReportController.generateSatisfactionPDF(filters);
      
      // Calcular métricas
      const generationTime = Date.now() - startTime;
      const fileSize = pdf.length;

      // Actualizar métricas en la base de datos
      await ReportGeneration.updateMetrics(reportGeneration.id, fileSize, generationTime);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      
      res.send(pdf);
    } catch (error) {
      console.error('Error al exportar reporte de satisfacción PDF:', error);
      
      // Actualizar estado de error si existe el registro
      if (reportGeneration) {
        await ReportGeneration.updateStatus(reportGeneration.id, 'failed', error.message);
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // =============================================
  // GESTIÓN DE HISTORIAL DE REPORTES
  // =============================================

  // Obtener historial de reportes del usuario
  static async getReportHistory(req, res) {
    try {
      const filters = {
        report_type: req.query.report_type,
        report_format: req.query.report_format,
        status: req.query.status,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        limit: parseInt(req.query.limit) || 20,
        offset: parseInt(req.query.offset) || 0
      };

      const reports = await ReportGeneration.findByUser(req.user.id, filters);
      
      res.json({
        success: true,
        data: reports.map(report => report.toJSONWithUser()),
        meta: {
          total: reports.length,
          filters: filters
        }
      });
    } catch (error) {
      console.error('Error al obtener historial de reportes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener estadísticas de reportes del usuario
  static async getReportStats(req, res) {
    try {
      const filters = {
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta
      };

      const stats = await ReportGeneration.getStats({
        user_id: req.user.id,
        ...filters
      });
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de reportes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener todos los reportes (solo para admins)
  static async getAllReports(req, res) {
    try {
      const filters = {
        user_id: req.query.user_id,
        report_type: req.query.report_type,
        report_format: req.query.report_format,
        status: req.query.status,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      };

      const reports = await ReportGeneration.findAll(filters);
      
      res.json({
        success: true,
        data: reports.map(report => report.toJSONWithUser()),
        meta: {
          total: reports.length,
          filters: filters
        }
      });
    } catch (error) {
      console.error('Error al obtener todos los reportes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener estadísticas generales de reportes (solo para admins)
  static async getGeneralReportStats(req, res) {
    try {
      const filters = {
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta
      };

      const stats = await ReportGeneration.getStats(filters);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error al obtener estadísticas generales de reportes:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // =============================================
  // GESTIÓN DE CACHE DE REPORTES
  // =============================================

  // Obtener estadísticas del cache
  static async getCacheStats(req, res) {
    try {
      const stats = await ReportDataCache.getCacheStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error al obtener estadísticas del cache:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Forzar actualización de datos de un evento
  static async forceUpdateEventData(req, res) {
    try {
      const { evento_id } = req.params;
      const { report_type } = req.body;

      if (!evento_id) {
        return res.status(400).json({
          success: false,
          message: 'ID de evento requerido'
        });
      }

      if (report_type && !['participation', 'satisfaction'].includes(report_type)) {
        return res.status(400).json({
          success: false,
          message: 'Tipo de reporte inválido. Debe ser "participation" o "satisfaction"'
        });
      }

      if (report_type) {
        // Actualizar tipo específico
        const result = await ReportDataCache.forceUpdate(evento_id, report_type);
        res.json({
          success: true,
          message: `Datos de ${report_type} actualizados para el evento`,
          data: result
        });
      } else {
        // Actualizar ambos tipos
        const participationResult = await ReportDataCache.forceUpdate(evento_id, 'participation');
        const satisfactionResult = await ReportDataCache.forceUpdate(evento_id, 'satisfaction');
        
        res.json({
          success: true,
          message: 'Datos de ambos tipos actualizados para el evento',
          data: {
            participation: participationResult,
            satisfaction: satisfactionResult
          }
        });
      }
    } catch (error) {
      console.error('Error al forzar actualización:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Limpiar datos obsoletos del cache
  static async cleanStaleData(req, res) {
    try {
      const { days_old = 30 } = req.body;
      
      const result = await ReportDataCache.cleanStaleData(days_old);
      
      res.json({
        success: true,
        message: `Se eliminaron ${result.deleted_count} entradas obsoletas del cache`,
        data: result
      });
    } catch (error) {
      console.error('Error al limpiar datos obsoletos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener datos del cache con filtros
  static async getCacheData(req, res) {
    try {
      const filters = {
        report_type: req.query.report_type,
        evento_id: req.query.evento_id,
        is_stale: req.query.is_stale === 'true' ? true : req.query.is_stale === 'false' ? false : undefined,
        fecha_desde: req.query.fecha_desde,
        fecha_hasta: req.query.fecha_hasta,
        limit: parseInt(req.query.limit) || 50,
        offset: parseInt(req.query.offset) || 0
      };

      const data = await ReportDataCache.getReportDataWithFilters(filters);
      
      res.json({
        success: true,
        data: data.map(item => item.toJSONWithEvent()),
        meta: {
          total: data.length,
          filters: filters
        }
      });
    } catch (error) {
      console.error('Error al obtener datos del cache:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = ReportController;
