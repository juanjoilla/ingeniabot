// src/services/timeoutService.js
const databaseService = require('./databaseService');

class TimeoutService {
  constructor() {
    this.timeouts = new Map(); // Guarda los timeouts activos por usuario
    this.TIEMPO_INACTIVIDAD = 10 * 60 * 1000; // 10 minutos por defecto
  }

  // Configurar tiempo de inactividad (en minutos)
  setTiempoInactividad(minutos) {
    this.TIEMPO_INACTIVIDAD = minutos * 60 * 1000;
    console.log(`⏰ Tiempo de inactividad configurado: ${minutos} minutos`);
  }

  // Iniciar o reiniciar timeout para un usuario
  iniciarTimeout(telefono, sock) {
    // Cancelar timeout anterior si existe
    this.cancelarTimeout(telefono);

    // Crear nuevo timeout
    const timeoutId = setTimeout(async () => {
      await this.enviarMensajeDespedida(telefono, sock);
      this.timeouts.delete(telefono);
    }, this.TIEMPO_INACTIVIDAD);

    // Guardar timeout
    this.timeouts.set(telefono, {
      timeoutId,
      iniciadoEn: new Date(),
      sock
    });

    console.log(`⏰ Timeout iniciado para ${telefono} (${this.TIEMPO_INACTIVIDAD / 60000} min)`);
  }

  // Cancelar timeout (cuando el usuario responde)
  cancelarTimeout(telefono) {
    const timeoutData = this.timeouts.get(telefono);
    if (timeoutData) {
      clearTimeout(timeoutData.timeoutId);
      this.timeouts.delete(telefono);
      console.log(`⏰ Timeout cancelado para ${telefono}`);
    }
  }

  // Enviar mensaje de despedida
 async enviarMensajeDespedida(telefono, sock) {
  try {
    const jid = `${telefono}@s.whatsapp.net`;
    const mensajeDespedida = this.generarMensajeDespedida();
    
    await sock.sendMessage(jid, { text: mensajeDespedida });
    console.log(`👋 Mensaje de despedida enviado a ${telefono}`);

    // Guardar en BD
    try {
      const estudiante = await databaseService.getEstudiante(telefono);
      if (estudiante) {
        // Guardar conversación
        await databaseService.saveConversacion(
          estudiante.id,
          '[TIMEOUT]',
          mensajeDespedida,
          false
        );
        
        // Guardar en log de timeouts
        await pool.query(
          `INSERT INTO timeout_log (estudiante_id, telefono, mensaje_enviado)
           VALUES ($1, $2, $3)`,
          [estudiante.id, telefono, mensajeDespedida]
        );
      }
    } catch (dbError) {
      console.error('Error al guardar en BD:', dbError.message);
    }
  } catch (error) {
    console.error(`Error al enviar despedida:`, error.message);
  }
}

  // Generar mensaje de despedida aleatorio
 generarMensajeDespedida() {
  const hora = new Date().getHours();
  
  // Mensajes por hora del día
  if (hora >= 6 && hora < 12) {
    // Mañana
    return `☀️ *¡Buenos días!*\n\n` +
           `Veo que has estado inactivo un rato. ¡Que tengas un excelente día!\n\n` +
           `Si necesitas ayuda, ¡escríbeme cuando quieras! 😊\n\n` +
           `_Escribe "hola" para continuar_`;
  } else if (hora >= 12 && hora < 18) {
    // Tarde
    return `🌤️ *¡Buenas tardes!*\n\n` +
           `Gracias por usar IngeniaBot. Espero haberte ayudado.\n\n` +
           `¡Estoy aquí cuando me necesites! 💙\n\n` +
           `_Escribe "menú" para volver_`;
  } else {
    // Noche
    return `🌙 *¡Buenas noches!*\n\n` +
           `Ha pasado un tiempo desde tu última consulta. ¡Que descanses bien!\n\n` +
           `Escríbeme mañana si necesitas algo. 😴\n\n` +
           `_Siempre disponible para ti_`;
  }
}

  // Verificar si un usuario tiene timeout activo
  tieneTimeoutActivo(telefono) {
    return this.timeouts.has(telefono);
  }

  // Obtener información de timeout
  getInfoTimeout(telefono) {
    const data = this.timeouts.get(telefono);
    if (!data) return null;

    const tiempoTranscurrido = Date.now() - data.iniciadoEn.getTime();
    const tiempoRestante = this.TIEMPO_INACTIVIDAD - tiempoTranscurrido;

    return {
      iniciadoEn: data.iniciadoEn,
      tiempoRestanteMs: tiempoRestante,
      tiempoRestanteMin: Math.floor(tiempoRestante / 60000)
    };
  }

  // Obtener estadísticas
  getEstadisticas() {
    return {
      timeoutsActivos: this.timeouts.size,
      tiempoInactividadMin: this.TIEMPO_INACTIVIDAD / 60000,
      usuarios: Array.from(this.timeouts.keys())
    };
  }

  // Limpiar todos los timeouts (para cuando el bot se cierra)
  limpiarTodos() {
    console.log(`🧹 Limpiando ${this.timeouts.size} timeouts activos...`);
    this.timeouts.forEach((data, telefono) => {
      clearTimeout(data.timeoutId);
    });
    this.timeouts.clear();
  }
}

module.exports = new TimeoutService();