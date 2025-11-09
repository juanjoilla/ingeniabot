// src/index.js - IngeniaBot Main Entry Point
require("dotenv").config();
const qrcode = require("qrcode-terminal");
const http = require("http");

// Debug: Verificar variables de entorno
console.log("🔍 DATABASE_URL existe:", !!process.env.DATABASE_URL);
console.log("🔍 GEMINI_API_KEY existe:", !!process.env.GEMINI_API_KEY);

const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const pino = require("pino");

// Importar configuraciones y servicios
const { testConnection } = require("./config/database");
const { testGeminiAPI } = require("./config/gemini");
const {
  MENU_PRINCIPAL,
  RESPUESTA_BIENVENIDA,
  COMANDOS,
} = require("./config/constants");
const databaseService = require("./services/databaseService");
const aiService = require("./services/aiService");

// Importar handlers
const { handleCursos } = require("./handlers/cursosHandler");
const { handlePagos } = require("./handlers/pagosHandler");
const {
  handleBienestar,
  handleSoporte,
  handleAdmision,
} = require("./handlers/menuHandler");
const agendaHandler = require("./handlers/agendaHandler");

// Logger configuración
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});

// ==================== VERIFICACIÓN INICIAL ====================

async function verificarConfiguracion() {
  console.log("🔍 Verificando configuración...\n");

  // Verificar variables de entorno
  const variablesRequeridas = ["DATABASE_URL", "GEMINI_API_KEY"];
  const faltantes = variablesRequeridas.filter((v) => !process.env[v]);

  if (faltantes.length > 0) {
    console.error("❌ Variables de entorno faltantes:", faltantes.join(", "));
    console.error("   Por favor configura el archivo .env");
    process.exit(1);
  }

  // Verificar conexión a base de datos
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error("❌ No se pudo conectar a la base de datos");
    console.error("   Verifica la variable DATABASE_URL en .env");
    process.exit(1);
  }

  // Verificar Gemini API
  const geminiOk = await testGeminiAPI();
  if (!geminiOk) {
    console.error("❌ No se pudo conectar a Gemini API");
    console.error("   Verifica la variable GEMINI_API_KEY en .env");
    process.exit(1);
  }

  console.log("✅ Configuración verificada correctamente\n");
}

// ==================== FUNCIÓN PRINCIPAL DEL BOT ====================

async function procesarMensaje(mensaje, estudianteId, estudiante) {
  const textoNormalizado = mensaje.toLowerCase().trim();

  // Comandos de menú (exactos)
  if (COMANDOS.MENU.some((cmd) => textoNormalizado === cmd)) {
    return MENU_PRINCIPAL;
  }

  // ==================== VALIDACIÓN ESTRICTA DE NÚMEROS ====================
  // Verifica si el mensaje es SOLO un número (ej: "1", "10", "100")
  if (/^\d+$/.test(textoNormalizado)) {
    const numero = parseInt(textoNormalizado);
    
    switch(numero) {
      case 1:
        return await handleCursos(estudianteId, estudiante);
      case 2:
        return await handlePagos(estudianteId);
      case 3:
        return await agendaHandler.handleVerAgenda(estudianteId);
      case 4:
        return handleBienestar();
      case 5:
        return handleSoporte();
      case 6:
        return handleAdmision();
      default:
        // Mensaje de error mejorado para opciones no válidas
        return `❌ *Opción "${numero}" no válida*\n\n` +
               `Las opciones disponibles son:\n\n` +
               `📚 *1* - Mis cursos\n` +
               `💳 *2* - Mis pagos\n` +
               `📅 *3* - Mi agenda\n` +
               `🏥 *4* - Bienestar estudiantil\n` +
               `🔧 *5* - Soporte técnico\n` +
               `🎓 *6* - Admisión\n\n` +
               `_O escribe tu pregunta y te responderé con IA_ 🤖`;
    }
  }

  // ==================== BÚSQUEDA POR PALABRAS CLAVE ====================
  // Solo entra aquí si NO es un número puro
  
  // Comandos de cursos (palabras clave)
  if (textoNormalizado.includes('curso') || textoNormalizado.includes('materia')) {
    return await handleCursos(estudianteId, estudiante);
  }

  // Comandos de pagos (palabras clave)
  if (textoNormalizado.includes('pago') || 
      textoNormalizado.includes('pension') || 
      textoNormalizado.includes('pensión') || 
      textoNormalizado.includes('deuda')) {
    return await handlePagos(estudianteId);
  }

  // Comandos de agenda (palabras clave)
  if (textoNormalizado === 'agenda' || textoNormalizado === 'mi agenda') {
    return await agendaHandler.handleVerAgenda(estudianteId);
  }
  
  if (textoNormalizado === 'agendar' || textoNormalizado === 'nueva cita') {
    return await agendaHandler.handleAgendarInicio();
  }
  
  // Cancelar cita
  if (textoNormalizado.startsWith('cancelar cita ')) {
    const numero = parseInt(textoNormalizado.split(' ')[2]);
    if (!isNaN(numero)) {
      return await agendaHandler.handleCancelarCita(estudianteId, numero);
    }
  }

  // Comandos de bienestar (palabras clave)
  if (textoNormalizado.includes('bienestar') || 
      textoNormalizado.includes('salud') || 
      textoNormalizado.includes('psicolog')) {
    return handleBienestar();
  }

  // Comandos de soporte (palabras clave)
  if (textoNormalizado.includes('soporte') || 
      textoNormalizado.includes('ayuda técnica') || 
      textoNormalizado.includes('problema')) {
    return handleSoporte();
  }

  // Comandos de admisión (palabras clave)
  if (textoNormalizado.includes('admision') || 
      textoNormalizado.includes('admisión') || 
      textoNormalizado.includes('postular')) {
    return handleAdmision();
  }

  // ==================== PREGUNTA LIBRE -> IA ====================
  logger.info(`Procesando pregunta con IA: ${mensaje.substring(0, 50)}...`);

  // Obtener contexto del estudiante
  const cursos = await databaseService.getCursos(estudianteId);
  const contexto = {
    estudiante: estudiante,
    cursos: cursos,
  };

  const resultado = await aiService.generarRespuestaIA(
    mensaje,
    estudianteId,
    contexto
  );

  let respuesta = `🤖 *IngeniaBot*\n\n${resultado.respuesta}\n\n`;

  if (resultado.fuente === "faq") {
    respuesta += `_💡 Respuesta de preguntas frecuentes_\n`;
  }

  respuesta += `\n_Escribe "menú" para volver al inicio_`;

  return respuesta;
}

// ==================== CONEXIÓN A WHATSAPP ====================

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    browser: Browsers.macOS("Chrome"),
    defaultQueryTimeoutMs: undefined,
  });

  // Guardar credenciales
  sock.ev.on("creds.update", saveCreds);

  // Manejo de conexión
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n📱 Escanea el código QR con WhatsApp\n");
      qrcode.generate(qr, { small: true });
      console.log("🔗 URL DE ESCANEO (CÓPIALA Y CONVIÉRTELA A QR):", qr);
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      console.error(
        "RAZÓN DE DESCONEXIÓN:",
        lastDisconnect?.error?.message || lastDisconnect?.error
      );

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log("🔄 Conexión cerrada. Reconectando...");
        setTimeout(() => connectToWhatsApp(), 3000);
      } else {
        console.log("❌ Sesión cerrada. Por favor escanea el QR nuevamente.");
        process.exit(0);
      }
    } else if (connection === "open") {
      console.log("✅ Bot conectado a WhatsApp exitosamente");
      console.log("📱 Esperando mensajes...\n");

      try {
        const stats = await databaseService.getEstadisticas();
        if (stats) {
          console.log("📊 Estadísticas:");
          console.log(
            `   - Usuarios activos (7 días): ${stats.usuariosActivos}`
          );
          console.log(
            `   - Total conversaciones: ${stats.totalConversaciones}`
          );
          console.log(`   - Uso de IA: ${stats.porcentajeIA}%\n`);
        }
      } catch (error) {
        // Ignorar si falla
      }
    }
  });

  // ==================== MANEJO DE MENSAJES (MEJORADO) ====================
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    
    // ==================== FILTROS MEJORADOS ====================
    
    // Ignorar si no hay mensaje
    if (!msg.message) {
      console.log('⏭️  Mensaje sin contenido ignorado');
      return;
    }
    
    // Ignorar mensajes propios
    if (msg.key.fromMe) {
      return;
    }
    
    // Ignorar mensajes de grupos
    if (msg.key.remoteJid.includes("@g.us")) {
      console.log('⏭️  Mensaje de grupo ignorado');
      return;
    }
    
    // ==================== FILTRO PARA @lid (LISTS) ====================
    // Ignorar mensajes de listas interactivas de WhatsApp
    if (msg.key.remoteJid.includes("@lid")) {
      console.log('⏭️  Mensaje de lista interactiva ignorado:', msg.key.remoteJid);
      return;
    }

    // Ignorar mensajes de newsletters/canales
    if (msg.key.remoteJid.includes("@newsletter")) {
      console.log('⏭️  Mensaje de canal/newsletter ignorado');
      return;
    }
    
    // ==================== EXTRAER TELÉFONO ====================
    const telefono = msg.key.remoteJid.replace("@s.whatsapp.net", "");
    
    // Validar que sea un número de teléfono válido (solo dígitos)
    if (!/^\d+$/.test(telefono)) {
      console.log(`⏭️  Número inválido ignorado: ${msg.key.remoteJid}`);
      return;
    }

    // Validar longitud razonable de teléfono (entre 8 y 15 dígitos)
    if (telefono.length < 8 || telefono.length > 15) {
      console.log(`⏭️  Longitud de teléfono inválida: ${telefono}`);
      return;
    }

    // ==================== EXTRAER TEXTO ====================
    const texto =
      msg.message.conversation || 
      msg.message.extendedTextMessage?.text || 
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      msg.message.documentMessage?.caption ||
      "";
    
    if (!texto) {
      console.log('⏭️  Mensaje sin texto ignorado');
      return;
    }

    logger.info(`📱 Mensaje de ${telefono}: ${texto.substring(0, 50)}...`);

    try {
      let estudiante = await databaseService.getEstudiante(telefono);
      if (!estudiante) {
        logger.info(`👤 Nuevo usuario registrado: ${telefono}`);
        estudiante = await databaseService.createEstudiante(telefono);
        await sock.sendMessage(msg.key.remoteJid, {
          text: RESPUESTA_BIENVENIDA,
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const respuesta = await procesarMensaje(texto, estudiante.id, estudiante);
      await sock.sendMessage(msg.key.remoteJid, { text: respuesta });
      await databaseService.saveConversacion(
        estudiante.id,
        texto,
        respuesta,
        respuesta.includes("🤖")
      );
      logger.info(`✅ Respuesta enviada a ${telefono}`);
    } catch (error) {
      logger.error(
        `❌ Error procesando mensaje de ${telefono}:`,
        error.message
      );
      try {
        await sock.sendMessage(msg.key.remoteJid, {
          text: "😔 Lo siento, ocurrió un error al procesar tu mensaje.\n\nPor favor intenta nuevamente en unos momentos.",
        });
      } catch (sendError) {
        logger.error("Error al enviar mensaje de error:", sendError);
      }
    }
  });

  return sock;
}

// ==================== INICIO DE LA APLICACIÓN ====================

async function main() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║                                        ║");
  console.log("║        🤖  INGENIABOT  🤖             ║");
  console.log("║                                        ║");
  console.log("║   Bot de WhatsApp Universitario        ║");
  console.log("║   con Inteligencia Artificial          ║");
  console.log("║                                        ║");
  console.log("╚════════════════════════════════════════╝");
  console.log();

  try {
    // Verificar configuración
    await verificarConfiguracion();

    // Conectar a WhatsApp
    console.log("🔄 Conectando a WhatsApp...\n");
    await connectToWhatsApp();

    // Health check server para Render
    const PORT = process.env.PORT || 3000;
    http
      .createServer((req, res) => {
        // Responder al health check de Render
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end("IngeniaBot is running (HTTP OK)");
      })
      .listen(PORT, () => {
        console.log(
          `📡 Servidor HTTP iniciado para Health Checks en puerto ${PORT}`
        );
      });
  } catch (error) {
    console.error("\n❌ Error fatal al iniciar el bot:", error.message);
    console.error("\nStack trace:", error.stack);
    process.exit(1);
  }
}

// Manejo de errores no capturados
process.on("unhandledRejection", (error) => {
  logger.error("❌ Unhandled Rejection:", error);
});

process.on("uncaughtException", (error) => {
  logger.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

// Manejo de señales de terminación
process.on("SIGINT", () => {
  console.log("\n\n👋 Cerrando IngeniaBot...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\n👋 Cerrando IngeniaBot...");
  process.exit(0);
});

// Iniciar aplicación
main();