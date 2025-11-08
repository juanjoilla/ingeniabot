// src/services/recordatorioService.js
const db = require('../config/database');
const pool = db.pool;

class RecordatorioService {
  
  constructor() {
    // Revisar recordatorios cada 5 minutos
    this.intervalo = null;
  }

  iniciar(sock) {
    console.log('🔔 Servicio de recordatorios iniciado');
    
    this.intervalo = setInterval(async () => {
      await this.enviarRecordatorios(sock);
    }, 5 * 60 * 1000); // 5 minutos
  }

  async enviarRecordatorios(sock) {
    try {
      // Buscar citas que necesitan recordatorio
      const result = await pool.query(
        `SELECT a.*, e.telefono
         FROM agenda a
         JOIN estudiantes e ON a.estudiante_id = e.id
         WHERE a.recordatorio_enviado = false
         AND a.estado IN ('pendiente', 'confirmado')
         AND a.fecha_hora > NOW()
         AND a.fecha_hora <= NOW() + (a.minutos_antes_recordatorio || ' minutes')::INTERVAL`
      );

      for (const cita of result.rows) {
        await this.enviarRecordatorio(sock, cita);
      }

    } catch (error) {
      console.error('Error al enviar recordatorios:', error);
    }
  }

  async enviarRecordatorio(sock, cita) {
    try {
      const fecha = new Date(cita.fecha_hora);
      const fechaFormato = fecha.toLocaleString('es-PE');

      const mensaje = `🔔 *Recordatorio de Cita*\n\n` +
                     `📝 ${cita.titulo}\n` +
                     `📆 ${fechaFormato}\n` +
                     `📍 ${cita.ubicacion || 'Sin ubicación'}\n\n` +
                     `⏰ Tu cita es en ${cita.minutos_antes_recordatorio} minutos.\n\n` +
                     `¡No olvides asistir! 😊`;

      const jid = `${cita.telefono}@s.whatsapp.net`;
      await sock.sendMessage(jid, { text: mensaje });

      // Marcar como enviado
      await pool.query(
        `UPDATE agenda SET recordatorio_enviado = true WHERE id = $1`,
        [cita.id]
      );

      console.log(`✅ Recordatorio enviado a ${cita.telefono} para: ${cita.titulo}`);

    } catch (error) {
      console.error(`Error al enviar recordatorio a ${cita.telefono}:`, error);
    }
  }

  detener() {
    if (this.intervalo) {
      clearInterval(this.intervalo);
      console.log('🔕 Servicio de recordatorios detenido');
    }
  }
}

module.exports = new RecordatorioService();