// src/handlers/agendaHandler.js
const db = require('../config/database');
const pool = db.pool;

class AgendaHandler {
  
  // Ver agenda
  async handleVerAgenda(estudianteId) {
    try {
      const result = await pool.query(
        `SELECT * FROM obtener_proximas_citas($1, 7)`,
        [estudianteId]
      );
      
      if (result.rows.length === 0) {
        return `📅 *Mi Agenda*\n\n` +
               `No tienes eventos programados para los próximos 7 días.\n\n` +
               `Para agendar algo nuevo, escribe:\n` +
               `*"agendar"* o *"nueva cita"*\n\n` +
               `_Escribe "menú" para volver al inicio_`;
      }

      let mensaje = `📅 *Mi Agenda - Próximos 7 Días*\n\n`;

      result.rows.forEach((item, index) => {
        const fecha = new Date(item.fecha_hora);
        const fechaFormato = fecha.toLocaleDateString('es-PE', { 
          weekday: 'short', 
          day: '2-digit', 
          month: 'short',
          year: 'numeric'
        });
        const horaFormato = fecha.toLocaleTimeString('es-PE', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        const icono = this.getIconoPorTipo(item.tipo);
        const tiempoRestante = this.formatearTiempoRestante(item.tiempo_restante);

        mensaje += `${index + 1}. ${icono} *${item.titulo}*\n`;
        mensaje += `   📆 ${fechaFormato} - ${horaFormato}\n`;
        mensaje += `   📍 ${item.ubicacion || 'Sin ubicación'}\n`;
        mensaje += `   ⏰ ${tiempoRestante}\n`;
        mensaje += `   Estado: ${item.estado === 'pendiente' ? '⏳ Pendiente' : '✅ Confirmado'}\n\n`;
      });

      mensaje += `───────────────────\n\n`;
      mensaje += `💡 *Opciones:*\n`;
      mensaje += `• *"agendar"* - Nueva cita\n`;
      mensaje += `• *"cancelar cita [número]"* - Cancelar\n\n`;
      mensaje += `_Escribe "menú" para volver al inicio_`;

      return mensaje;

    } catch (error) {
      console.error('Error en handleVerAgenda:', error);
      return `❌ Error al consultar tu agenda.\n\n_Escribe "menú" para volver al inicio_`;
    }
  }

  // Agendar nueva cita - Paso 1: Elegir tipo
  async handleAgendarInicio() {
    return `📅 *Agendar Nueva Cita*\n\n` +
           `¿Qué tipo de evento deseas agendar?\n\n` +
           `1️⃣ Cita médica/psicológica\n` +
           `2️⃣ Asesoría académica\n` +
           `3️⃣ Tutoría\n` +
           `4️⃣ Recordatorio personal\n` +
           `5️⃣ Otro\n\n` +
           `Escribe el número de tu elección 👇`;
  }

  // Proceso de agendamiento interactivo
  async procesarAgendamiento(mensaje, estudianteId, paso = 1, datosTemporales = {}) {
    // Este método maneja el flujo de conversación para agendar
    // En la práctica, necesitarías mantener el estado en la BD o en memoria
    
    switch(paso) {
      case 1: // Tipo seleccionado
        const tipos = ['cita', 'asesoria', 'tutoria', 'recordatorio', 'otro'];
        const tipoIndex = parseInt(mensaje) - 1;
        
        if (tipoIndex >= 0 && tipoIndex < tipos.length) {
          datosTemporales.tipo = tipos[tipoIndex];
          return {
            respuesta: `✅ Tipo: *${tipos[tipoIndex]}*\n\n` +
                      `Ahora, ¿cuál es el motivo o título?\n\n` +
                      `Ejemplo: "Consulta con psicólogo" o "Tutoría de Matemáticas"`,
            siguientePaso: 2,
            datos: datosTemporales
          };
        }
        return {
          respuesta: `❌ Opción no válida. Por favor elige del 1 al 5.`,
          siguientePaso: 1,
          datos: datosTemporales
        };

      case 2: // Título recibido
        datosTemporales.titulo = mensaje;
        return {
          respuesta: `✅ Título: "${mensaje}"\n\n` +
                    `¿Para qué fecha y hora?\n\n` +
                    `Formato: DD/MM/YYYY HH:MM\n` +
                    `Ejemplo: 15/11/2024 14:30`,
          siguientePaso: 3,
          datos: datosTemporales
        };

      case 3: // Fecha y hora
        const fecha = this.parsearFechaHora(mensaje);
        if (!fecha) {
          return {
            respuesta: `❌ Formato de fecha incorrecto.\n\n` +
                      `Por favor usa: DD/MM/YYYY HH:MM\n` +
                      `Ejemplo: 15/11/2024 14:30`,
            siguientePaso: 3,
            datos: datosTemporales
          };
        }

        datosTemporales.fecha_hora = fecha;
        return {
          respuesta: `✅ Fecha: ${fecha.toLocaleString('es-PE')}\n\n` +
                    `¿Dónde será? (ubicación)\n\n` +
                    `Ejemplo: "Lab 302" o "Centro Médico" o escribe "ninguna"`,
          siguientePaso: 4,
          datos: datosTemporales
        };

      case 4: // Ubicación
        datosTemporales.ubicacion = mensaje.toLowerCase() === 'ninguna' ? null : mensaje;
        
        // Guardar en BD
        await this.guardarCita(estudianteId, datosTemporales);
        
        const fechaFinal = new Date(datosTemporales.fecha_hora);
        return {
          respuesta: `✅ *Cita agendada exitosamente!*\n\n` +
                    `📝 ${datosTemporales.titulo}\n` +
                    `📆 ${fechaFinal.toLocaleDateString('es-PE')}\n` +
                    `🕐 ${fechaFinal.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}\n` +
                    `📍 ${datosTemporales.ubicacion || 'Sin ubicación'}\n\n` +
                    `🔔 Te recordaré 1 hora antes.\n\n` +
                    `Escribe *"agenda"* para ver todas tus citas.`,
          siguientePaso: 'completado',
          datos: {}
        };
    }
  }

  // Guardar cita en BD
  async guardarCita(estudianteId, datos) {
    try {
      await pool.query(
        `INSERT INTO agenda (estudiante_id, tipo, titulo, fecha_hora, ubicacion, minutos_antes_recordatorio)
         VALUES ($1, $2, $3, $4, $5, 60)`,
        [estudianteId, datos.tipo, datos.titulo, datos.fecha_hora, datos.ubicacion]
      );
      console.log(`✅ Cita guardada para estudiante ${estudianteId}`);
    } catch (error) {
      console.error('Error al guardar cita:', error);
      throw error;
    }
  }

  // Cancelar cita
  async handleCancelarCita(estudianteId, numeroCita) {
    try {
      // Obtener citas del estudiante
      const citas = await pool.query(
        `SELECT id, titulo FROM agenda 
         WHERE estudiante_id = $1 
         AND fecha_hora > NOW() 
         AND estado IN ('pendiente', 'confirmado')
         ORDER BY fecha_hora ASC`,
        [estudianteId]
      );

      if (numeroCita < 1 || numeroCita > citas.rows.length) {
        return `❌ Número de cita inválido.\n\nEscribe *"agenda"* para ver tus citas.`;
      }

      const cita = citas.rows[numeroCita - 1];

      await pool.query(
        `UPDATE agenda SET estado = 'cancelado', updated_at = NOW() WHERE id = $1`,
        [cita.id]
      );

      return `✅ *Cita cancelada*\n\n` +
             `📝 ${cita.titulo}\n\n` +
             `La cita ha sido cancelada exitosamente.\n\n` +
             `_Escribe "menú" para volver al inicio_`;

    } catch (error) {
      console.error('Error al cancelar cita:', error);
      return `❌ Error al cancelar la cita.\n\n_Escribe "menú" para volver al inicio_`;
    }
  }

  // Utilidades
  getIconoPorTipo(tipo) {
    const iconos = {
      'cita': '🏥',
      'clase': '📚',
      'examen': '📝',
      'evento': '🎉',
      'recordatorio': '⏰',
      'asesoria': '👨‍🏫',
      'tutoria': '📖'
    };
    return iconos[tipo] || '📅';
  }

  formatearTiempoRestante(interval) {
    // PostgreSQL devuelve interval como string
    // Parsearlo y formatear
    const match = interval.match(/(\d+) days?|(\d+):(\d+):(\d+)/);
    if (!match) return 'Próximamente';

    if (match[1]) {
      const dias = parseInt(match[1]);
      return `En ${dias} día${dias > 1 ? 's' : ''}`;
    }

    const horas = parseInt(match[2] || 0);
    const minutos = parseInt(match[3] || 0);

    if (horas > 24) {
      const dias = Math.floor(horas / 24);
      return `En ${dias} día${dias > 1 ? 's' : ''}`;
    }
    if (horas > 0) {
      return `En ${horas} hora${horas > 1 ? 's' : ''}`;
    }
    return `En ${minutos} minutos`;
  }

  parsearFechaHora(texto) {
    // Formato: DD/MM/YYYY HH:MM
    const regex = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})/;
    const match = texto.match(regex);

    if (!match) return null;

    const [, dia, mes, anio, hora, minuto] = match;
    const fecha = new Date(anio, mes - 1, dia, hora, minuto);

    // Validar que la fecha sea futura
    if (fecha < new Date()) {
      return null;
    }

    return fecha;
  }
}

module.exports = new AgendaHandler();