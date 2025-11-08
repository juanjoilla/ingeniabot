// src/handlers/pagosHandler.js
const databaseService = require('../services/databaseService');

async function handlePagos(estudianteId) {
  try {
    const pagos = await databaseService.getPagos(estudianteId);
    
    if (pagos.length === 0) {
      return `💳 *Estado de Pagos*\n\n✅ No tienes pagos registrados en el sistema.\n¡Estás al día!\n\n_Escribe "menú" para volver al inicio_`;
    }

    let mensaje = `💳 *Estado de Pagos*\n\n`;
    let totalPendiente = 0;
    let totalPagado = 0;
    let pagosPendientes = [];
    let pagosPagados = [];

    pagos.forEach(pago => {
      const fecha = new Date(pago.fecha_vencimiento);
      const fechaFormato = fecha.toLocaleDateString('es-PE', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
      
      const pagoInfo = {
        icono: pago.estado === 'pagado' ? '✅' : '⏳',
        concepto: pago.concepto,
        monto: parseFloat(pago.monto),
        fecha: fechaFormato,
        estado: pago.estado
      };

      if (pago.estado === 'pendiente') {
        pagosPendientes.push(pagoInfo);
        totalPendiente += pagoInfo.monto;
      } else {
        pagosPagados.push(pagoInfo);
        totalPagado += pagoInfo.monto;
      }
    });

    // Mostrar pagos pendientes primero
    if (pagosPendientes.length > 0) {
      mensaje += `⚠️ *PAGOS PENDIENTES:*\n\n`;
      pagosPendientes.forEach(pago => {
        mensaje += `${pago.icono} *${pago.concepto}*\n`;
        mensaje += `   💰 Monto: S/ ${pago.monto.toFixed(2)}\n`;
        mensaje += `   📅 Vence: ${pago.fecha}\n\n`;
      });
      mensaje += `💡 *Total pendiente: S/ ${totalPendiente.toFixed(2)}*\n\n`;
      mensaje += `───────────────────\n\n`;
    }

    // Mostrar pagos realizados
    if (pagosPagados.length > 0) {
      mensaje += `✅ *PAGOS REALIZADOS:*\n\n`;
      pagosPagados.slice(0, 3).forEach(pago => {
        mensaje += `${pago.icono} ${pago.concepto}\n`;
        mensaje += `   S/ ${pago.monto.toFixed(2)} - ${pago.fecha}\n\n`;
      });
      
      if (pagosPagados.length > 3) {
        mensaje += `_... y ${pagosPagados.length - 3} pagos más_\n\n`;
      }
    }

    // Información de contacto para pagos
    mensaje += `───────────────────\n\n`;
    mensaje += `📞 *Para realizar pagos:*\n`;
    mensaje += `• Tesorería: (01) 555-0123\n`;
    mensaje += `• Email: pagos@universidad.edu.pe\n`;
    mensaje += `• Horario: Lun-Vie 9am-5pm\n\n`;
    mensaje += `_Escribe "menú" para volver al inicio_`;

    return mensaje;

  } catch (error) {
    console.error('Error en handlePagos:', error);
    return `❌ Hubo un error al consultar tus pagos.\n\nPor favor intenta nuevamente en unos momentos.\n\n_Escribe "menú" para volver al inicio_`;
  }
}

module.exports = { handlePagos };