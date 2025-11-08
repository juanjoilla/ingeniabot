// src/handlers/agendaHandler.js
const db = require('../config/database');
const pool = db.pool;

class AgendaHandler {
  
  // Ver agenda
  async handleVerAgenda(estudianteId) {
    try {
      const result = await pool.query(
        `SELECT 
          id, 
          tipo, 
          titulo, 
          fecha_hora, 
          ubicacion, 
          estado
         FROM agenda
         WHERE estudiante_id = $1
         AND fecha_hora > NOW()
         AND fecha_hora < NOW() + INTERVAL '7 days'
         AND estado IN ('pendiente', 'confirmado')
         ORDER BY fecha_hora ASC`,
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
        const tiempoRestante = this.formatearTiempoRestante(item.fecha_hora);

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

  formatearTiempoRestante(fechaHora) {
    // Calcular diferencia de tiempo directamente
    const ahora = new Date();
    const fecha = new Date(fechaHora);
    const diferenciaMilisegundos = fecha - ahora;

    if (diferenciaMilisegundos < 0) {
      return 'Ya pasó';
    }

    const minutos = Math.floor(diferenciaMilisegundos / (1000 * 60));
    const horas = Math.floor(minutos / 60);
    const dias = Math.floor(horas / 24);

    if (dias > 0) {
      return `En ${dias} día${dias > 1 ? 's' : ''}`;
    }
    if (horas > 0) {
      return `En ${horas} hora${horas > 1 ? 's' : ''}`;
    }
    if (minutos > 0) {
      return `En ${minutos} minuto${minutos > 1 ? 's' : ''}`;
    }
    return 'Ahora mismo';
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