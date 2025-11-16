// src/index.js - IngeniaBot Main Entry Point
require("dotenv").config();
const qrcode = require("qrcode-terminal");
const http = require("http");
const fs = require("fs");
const path = require("path");

// Debug: Verificar variables de entorno
console.log("🔍 DATABASE_URL existe:", !!process.env.DATABASE_URL);
console.log("🔍 GEMINI_API_KEY existe:", !!process.env.GEMINI_API_KEY);

const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  delay,
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
const timeoutService = require("./services/timeoutService");

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

// Variables globales para control de sesión
let intentosReconexion = 0;
const MAX_INTENTOS_RECONEXION = 10;
let tiempoEsperaQR = 60000; // 60 segundos por defecto

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

// ==================== FUNCIÓN PARA ANALIZAR MENSAJES ====================
function analizarMensaje(msg) {
  const info = {
    remoteJid: msg.key.remoteJid,
    participant: msg.key.participant || null,
    fromMe: msg.key.fromMe,
    messageKeys: Object.keys(msg.message || {}),
    pushName: msg.pushName || "Sin nombre",
  };

  // ==================== CASOS ESPECIALES PRIMERO ====================

  // Estados/Historias de WhatsApp
  if (info.remoteJid === "status@broadcast") {
    info.tipo = "ESTADO";
    return info;
  }

  // Broadcasts sin participante (historias, anuncios)
  if (info.remoteJid.includes("@broadcast") && !info.participant) {
    info.tipo = "BROADCAST_ANONIMO";
    return info;
  }

  // ==================== TIPOS NORMALES ====================

  // Grupos
  if (info.remoteJid.includes("@g.us")) {
    info.tipo = "GRUPO";
  }
  // Listas de difusión con participante
  else if (info.remoteJid.includes("@broadcast") && info.participant) {
    info.tipo = "LISTA_DIFUSION";
    info.numeroReal = info.participant?.replace("@s.whatsapp.net", "");
  }
  // Listas interactivas del bot
  else if (info.remoteJid.includes("@lid")) {
    info.tipo = "LISTA_INTERACTIVA";
  }
  // Canales/Newsletters
  else if (info.remoteJid.includes("@newsletter")) {
    info.tipo = "CANAL";
  }
  // Mensaje directo normal
  else if (info.remoteJid.includes("@s.whatsapp.net")) {
    info.tipo = "DIRECTO";
    info.numeroReal = info.remoteJid.replace("@s.whatsapp.net", "");
  }
  // Otros
  else {
    info.tipo = "DESCONOCIDO";
  }

  return info;
}
// ==================== FUNCIÓN PRINCIPAL DEL BOT ====================

async function procesarMensaje(mensaje, estudianteId, estudiante) {
  const textoNormalizado = mensaje.toLowerCase().trim();

  if (textoNormalizado === "/timeout") {
    const info = timeoutService.getInfoTimeout(estudiante.telefono);
    if (info) {
      return (
        `⏰ *Información de Timeout*\n\n` +
        `Iniciado: ${info.iniciadoEn.toLocaleString("es-PE")}\n` +
        `Tiempo restante: ${info.tiempoRestanteMin} minutos\n\n` +
        `_El timeout se reinicia cada vez que me escribes_`
      );
    } else {
      return `⏰ No tienes timeout activo en este momento.`;
    }
  }

  if (
    textoNormalizado === "/stats" &&
    estudiante.telefono === process.env.ADMIN_PHONE
  ) {
    const stats = timeoutService.getEstadisticas();
    return (
      `📊 *Estadísticas de Timeout*\n\n` +
      `⏰ Tiempo de inactividad: ${stats.tiempoInactividadMin} min\n` +
      `👥 Timeouts activos: ${stats.timeoutsActivos}\n` +
      `📱 Usuarios: ${stats.usuarios.length}\n\n` +
      `_Solo visible para admins_`
    );
  }

  // ==================== COMANDO ESPECIAL: INFO DEL BOT ====================
  if (textoNormalizado === "/info" || textoNormalizado === "/bot") {
    const numeroBot = global.BOT_NUMBER || "Desconocido";
    return (
      `🤖 *Información del Bot*\n\n` +
      `📞 Número: +${numeroBot}\n` +
      `🆔 JID: ${global.BOT_JID || "N/A"}\n` +
      `👤 Nombre: ${global.BOT_NAME || "IngeniaBot"}\n` +
      `⏰ Uptime: ${Math.floor(process.uptime() / 60)} minutos\n` +
      `📊 Node.js: ${process.version}\n` +
      `💾 Memoria: ${Math.round(
        process.memoryUsage().heapUsed / 1024 / 1024
      )} MB\n` +
      `🔄 Intentos reconexión: ${intentosReconexion}/${MAX_INTENTOS_RECONEXION}\n\n` +
      `_Escribe "menú" para volver al inicio_`
    );
  }

  // Comandos de menú (exactos)
  if (COMANDOS.MENU.some((cmd) => textoNormalizado === cmd)) {
    return MENU_PRINCIPAL;
  }

  // ==================== VALIDACIÓN ESTRICTA DE NÚMEROS ====================
  if (/^\d+$/.test(textoNormalizado)) {
    const numero = parseInt(textoNormalizado);

    switch (numero) {
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
        return (
          `❌ *Opción "${numero}" no válida*\n\n` +
          `Las opciones disponibles son:\n\n` +
          `📚 *1* - Mis cursos\n` +
          `💳 *2* - Mis pagos\n` +
          `📅 *3* - Mi agenda\n` +
          `🏥 *4* - Bienestar estudiantil\n` +
          `🔧 *5* - Soporte técnico\n` +
          `🎓 *6* - Admisión\n\n` +
          `_O escribe tu pregunta y te responderé con IA_ 🤖`
        );
    }
  }

  // ==================== BÚSQUEDA POR PALABRAS CLAVE ====================

  // Comandos de cursos
  if (
    textoNormalizado.includes("curso") ||
    textoNormalizado.includes("materia")
  ) {
    return await handleCursos(estudianteId, estudiante);
  }

  // Comandos de pagos
  if (
    textoNormalizado.includes("pago") ||
    textoNormalizado.includes("pension") ||
    textoNormalizado.includes("pensión") ||
    textoNormalizado.includes("deuda")
  ) {
    return await handlePagos(estudianteId);
  }

  // Comandos de agenda
  if (textoNormalizado === "agenda" || textoNormalizado === "mi agenda") {
    return await agendaHandler.handleVerAgenda(estudianteId);
  }

  if (textoNormalizado === "agendar" || textoNormalizado === "nueva cita") {
    return await agendaHandler.handleAgendarInicio();
  }

  // Cancelar cita
  if (textoNormalizado.startsWith("cancelar cita ")) {
    const numero = parseInt(textoNormalizado.split(" ")[2]);
    if (!isNaN(numero)) {
      return await agendaHandler.handleCancelarCita(estudianteId, numero);
    }
  }

  // Comandos de bienestar
  if (
    textoNormalizado.includes("bienestar") ||
    textoNormalizado.includes("salud") ||
    textoNormalizado.includes("psicolog")
  ) {
    return handleBienestar();
  }

  // Comandos de soporte
  if (
    textoNormalizado.includes("soporte") ||
    textoNormalizado.includes("ayuda técnica") ||
    textoNormalizado.includes("problema")
  ) {
    return handleSoporte();
  }

  // Comandos de admisión
  if (
    textoNormalizado.includes("admision") ||
    textoNormalizado.includes("admisión") ||
    textoNormalizado.includes("postular")
  ) {
    return handleAdmision();
  }

  // ==================== PREGUNTA LIBRE -> IA ====================
  logger.info(`Procesando pregunta con IA: ${mensaje.substring(0, 50)}...`);

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
    // ==================== CONFIGURACIÓN MEJORADA PARA ESTABILIDAD ====================
    connectTimeoutMs: 60000, // 60 segundos para conectar
    keepAliveIntervalMs: 30000, // Keep-alive cada 30 segundos
    qrTimeout: 120000, // 120 segundos (2 minutos) para escanear QR
    retryRequestDelayMs: 2000, // Reintentar después de 2 segundos
    maxMsgRetryCount: 5, // Máximo 5 reintentos
    markOnlineOnConnect: true, // Marcar como online al conectar
    syncFullHistory: false, // No sincronizar todo el historial (más rápido)
    // ==================== CONFIGURACIÓN ANTI-DESCONEXIÓN ====================
    getMessage: async (key) => {
      // Retornar mensajes vacíos para evitar errores
      return { conversation: "" };
    },
  });

  // Guardar credenciales automáticamente
  sock.ev.on("creds.update", saveCreds);

  // ==================== MANEJO DE CONEXIÓN MEJORADO ====================
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // ==================== QR CODE ====================
    if (qr) {
      console.log("\n╔════════════════════════════════════════╗");
      console.log("║   📱 ESCANEA EL CÓDIGO QR (2 MIN)  📱 ║");
      console.log("╚════════════════════════════════════════╝\n");
      qrcode.generate(qr, { small: true });
      console.log("\n🔗 URL QR (para generar QR externo):");
      console.log(qr);
      console.log("\n⏰ Tienes 2 minutos para escanear el código\n");
    }

    // ==================== DESCONEXIÓN ====================
    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.error("\n❌ CONEXIÓN CERRADA");
      console.error("Razón:", lastDisconnect?.error?.message || "Desconocida");
      console.error("Código de estado:", statusCode);

      // Mapeo de códigos de desconexión
      const motivoDesconexion = {
        [DisconnectReason.badSession]: "Sesión corrupta - Eliminar auth_info",
        [DisconnectReason.connectionClosed]: "Conexión cerrada por el servidor",
        [DisconnectReason.connectionLost]: "Conexión perdida - Reconectando",
        [DisconnectReason.connectionReplaced]:
          "Sesión abierta en otro dispositivo",
        [DisconnectReason.loggedOut]: "Sesión cerrada - Escanear QR nuevamente",
        [DisconnectReason.restartRequired]: "Reinicio requerido",
        [DisconnectReason.timedOut]: "Tiempo de espera agotado",
      };

      console.error(
        "Motivo:",
        motivoDesconexion[statusCode] || "Motivo desconocido"
      );

      if (shouldReconnect) {
        intentosReconexion++;

        if (intentosReconexion > MAX_INTENTOS_RECONEXION) {
          console.error(
            `\n❌ Se alcanzó el límite de ${MAX_INTENTOS_RECONEXION} intentos de reconexión`
          );
          console.error("Por favor reinicia el bot manualmente");
          process.exit(1);
        }

        // Tiempo de espera exponencial entre reconexiones
        const tiempoEspera = Math.min(
          1000 * Math.pow(2, intentosReconexion),
          30000
        );
        console.log(
          `\n🔄 Intento de reconexión ${intentosReconexion}/${MAX_INTENTOS_RECONEXION}`
        );
        console.log(`⏰ Esperando ${tiempoEspera / 1000} segundos...\n`);

        setTimeout(() => connectToWhatsApp(), tiempoEspera);
      } else {
        console.log("\n❌ Sesión cerrada. Requiere escanear QR nuevamente.");
        console.log("💡 Elimina la carpeta 'auth_info' y reinicia el bot\n");

        // Opcional: Eliminar auth_info automáticamente
        if (statusCode === DisconnectReason.loggedOut) {
          try {
            const authPath = path.join(__dirname, "../auth_info");
            if (fs.existsSync(authPath)) {
              fs.rmSync(authPath, { recursive: true, force: true });
              console.log("🗑️  Carpeta auth_info eliminada");
              console.log("🔄 Reiniciando para generar nuevo QR...\n");
              setTimeout(() => {
                process.exit(0); // Render lo reiniciará automáticamente
              }, 3000);
            }
          } catch (error) {
            console.error("Error al eliminar auth_info:", error);
          }
        }
      }
    }

    // ==================== CONEXIÓN ESTABLECIDA ====================
    else if (connection === "open") {
      console.log("\n✅ Bot conectado a WhatsApp exitosamente");
      intentosReconexion = 0; // Resetear contador

      // ==================== OBTENER INFO DEL BOT ====================
      try {
        const botInfo = sock.user;
        const numeroBot = botInfo.id.split(":")[0];
        const nombreBot = botInfo.name || "IngeniaBot";
        const jid = botInfo.id.replace(":0", "@s.whatsapp.net");

        console.log("\n╔════════════════════════════════════════╗");
        console.log("║       📱 INFORMACIÓN DEL BOT 📱       ║");
        console.log("╚════════════════════════════════════════╝");
        console.log(`📞 Número: +${numeroBot}`);
        console.log(`👤 Nombre: ${nombreBot}`);
        console.log(`🆔 JID: ${jid}`);
        console.log("════════════════════════════════════════\n");

        // Guardar en variables globales
        global.BOT_NUMBER = numeroBot;
        global.BOT_JID = jid;
        global.BOT_NAME = nombreBot;
      } catch (error) {
        console.error("⚠️  No se pudo obtener info del bot:", error.message);
      }

      console.log("📱 Esperando mensajes...\n");

      // Mostrar estadísticas
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
        // Ignorar
      }
    }
  });

  // ==================== MANEJO DE MENSAJES (MEJORADO) ===================
  // ==================== MANEJO DE MENSAJES (MEJORADO) ====================
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    // ==================== FILTRO DE ESTADOS/HISTORIAS ====================
    // Las historias vienen con key.remoteJid = "status@broadcast"
    if (msg.key.remoteJid === "status@broadcast") {
      logger.info("⏭️  Historia/Estado ignorado");
      return;
    }

    // Análisis del mensaje
    // No necesitamos un análisis tan granular para la identificación básica
    // del remitente en 1:1. El remoteJid es suficiente.
    const analisis = analizarMensaje(msg); // Mantener para el log o si lo usas en otros handlers

    // Log de debug (solo en desarrollo)
    if (process.env.NODE_ENV === "development") {
      logger.debug("🔍 Análisis:", JSON.stringify(analisis, null, 2));
    }

    // ==================== FILTROS DE MENSAJES NO DESEADOS ====================

    // Ignorar si no hay contenido en el mensaje (ej. solo notificaciones de estado)
    if (!msg.message) {
      logger.info("⏭️  Mensaje sin contenido (posible notificación)");
      return;
    }

    // Ignorar mensajes enviados por el propio bot
    if (msg.key.fromMe) {
      return;
    }

    // Ignorar mensajes de grupos, listas interactivas o canales por defecto
    // Si quieres que el bot responda en grupos, tendrías que ajustar esta lógica.
    // Para chats 1:1 con personas no agregadas, el remoteJid es el JID del remitente.
    const remoteJid = msg.key.remoteJid;

    if (remoteJid.endsWith("@g.us")) {
      logger.info(`⏭️  Mensaje de grupo ignorado: ${remoteJid}`);
      return;
    }
    if (remoteJid.endsWith("@lid")) {
      logger.info(`⏭️  Mensaje de lista interactiva ignorado: ${remoteJid}`);
      return;
    }
    if (remoteJid.endsWith("@newsletter")) {
      logger.info(`⏭️  Mensaje de canal ignorado: ${remoteJid}`);
      return;
    }
    // Este filtro adicional para broadcasts es redundante si ya ignoramos grupos, canales, etc.
    // Si remoteJid incluye "@broadcast" y no tiene participant, ya fue filtrado por "status@broadcast" o no es un tipo que queremos procesar.
    // Lo eliminamos para simplificar y no bloquear mensajes 1:1 que podrían venir con alguna inconsistencia de 'participant'.
    // if (remoteJid.includes("@broadcast") && !msg.key.participant) {
    //   logger.info("⏭️  Broadcast sin participante ignorado (posible historia/notificación)");
    //   return;
    // }


    // ==================== EXTRAER TELÉFONO Y TARGET JID ====================
    // Para cualquier mensaje 1:1 (sea contacto o no), el remoteJid es el JID del remitente.
    // El JID de un usuario siempre termina en "@s.whatsapp.net".
    let targetJid = remoteJid;
    let telefono = remoteJid.split("@")[0]; // Extrae solo el número

    // Si es un mensaje de una lista de difusión donde queremos responder al remitente
    // La clave es que msg.key.participant contiene el JID del remitente real dentro de la difusión.
    if (msg.key.participant && remoteJid.includes("@broadcast")) {
        targetJid = msg.key.participant;
        telefono = msg.key.participant.split("@")[0];
        logger.info(`📢 Mensaje de lista de difusión, respondiendo a participante: ${telefono}`);
    } else {
        logger.info(`💬 Mensaje directo (o desde difusión, respondiendo al chat principal): ${telefono}`);
    }


    // Validar teléfono (asegurarse de que sea un número)
    if (!/^\d+$/.test(telefono) || telefono.length < 8 || telefono.length > 15) {
      logger.warn(`⏭️  Número de teléfono inválido o formato inesperado: ${telefono}. Ignorando mensaje.`);
      return;
    }

    // ==================== EXTRAER TEXTO DEL MENSAJE ====================
    const texto =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      msg.message.videoMessage?.caption ||
      msg.message.documentMessage?.caption ||
      "";

    if (!texto) {
      logger.info(`⏭️  Mensaje de ${telefono} sin texto, tipo: ${Object.keys(msg.message || {})[0] || 'Desconocido'}`);
      return;
    }

    logger.info(
      `📱 [${analisis.tipo || 'DIRECTO_FALLBACK'}] Mensaje de ${telefono}: ${texto.substring(
        0,
        50
      )}...`
    );

    // ==================== PROCESAR MENSAJE ====================
    try {
      let estudiante = await databaseService.getEstudiante(telefono);

      if (!estudiante) {
        logger.info(`👤 Nuevo usuario detectado: ${telefono}`);
        estudiante = await databaseService.createEstudiante(telefono);
        await sock.sendMessage(targetJid, { text: RESPUESTA_BIENVENIDA });
        await delay(1000); // Pequeña pausa para simular una conversación más natural
      }

      timeoutService.cancelarTimeout(telefono);

      const respuesta = await procesarMensaje(texto, estudiante.id, estudiante);
      await sock.sendMessage(targetJid, { text: respuesta });

      await databaseService.saveConversacion(
        estudiante.id,
        texto,
        respuesta,
        respuesta.includes("🤖") // Asume que si incluye '🤖' es respuesta de IA
      );

      logger.info(`✅ Respuesta enviada a ${telefono}`);
      timeoutService.iniciarTimeout(telefono, sock);
    } catch (error) {
      logger.error(
        `❌ Error procesando mensaje de ${telefono}:`,
        error.message
      );
      logger.error(`Stack:`, error.stack); // Agrega el stack para más detalle

      try {
        await sock.sendMessage(targetJid, {
          text: "😔 Lo siento, ocurrió un error interno.\n\nPor favor, intenta nuevamente más tarde o contacta con soporte.",
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

    // ==================== CONFIGURAR TIMEOUT ====================
    // Puedes cambiar el tiempo aquí (en minutos)
    const MINUTOS_INACTIVIDAD = process.env.TIMEOUT_MINUTOS || 10;
    timeoutService.setTiempoInactividad(parseInt(MINUTOS_INACTIVIDAD));

    // Conectar a WhatsApp
    console.log("🔄 Conectando a WhatsApp...\n");
    await connectToWhatsApp();

    // Health check server para Render
    const PORT = process.env.PORT || 3000;
    const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    // Health check más robusto
    const status = {
      status: "ok",
      uptime: Math.floor(process.uptime()),
      bot_connected: !!global.BOT_NUMBER,
      bot_number: global.BOT_NUMBER || "disconnected",
      memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      timestamp: new Date().toISOString()
    };
    
    res.writeHead(200, { 
      "Content-Type": "application/json",
      "Cache-Control": "no-cache"
    });
    res.end(JSON.stringify(status, null, 2));
  } else if (req.url === "/info") {
    const info = {
      numero: global.BOT_NUMBER || "No conectado",
      nombre: global.BOT_NAME || "N/A",
      jid: global.BOT_JID || "No conectado",
      status: global.BOT_NUMBER ? "connected" : "disconnected",
      uptime: Math.floor(process.uptime() / 60) + " minutos",
      memoria: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
      intentosReconexion: intentosReconexion,
      platform: process.platform,
      nodeVersion: process.version
    };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(info, null, 2));
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`📡 Servidor HTTP en puerto ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 Info: http://localhost:${PORT}/info\n`);
});

// ==================== IMPORTANTE: MANTENER SERVIDOR VIVO ====================
// Prevenir que Node.js cierre el proceso
server.on('error', (error) => {
  console.error('❌ Error en servidor HTTP:', error);
});

// Keep-alive: responder a Render cada 25 segundos
setInterval(() => {
  // Render hace health checks, este interval mantiene el event loop activo
  if (global.BOT_NUMBER) {
    console.log(`💓 Bot activo - ${new Date().toLocaleTimeString()}`);
  }
}, 25000); // 25 segundos
  } catch (error) {
    console.error("\n❌ Error fatal:", error.message);
    console.error("\nStack:", error.stack);
    process.exit(1);
  }
}

// ==================== MANEJO DE ERRORES ====================

process.on("unhandledRejection", (error) => {
  logger.error("❌ Unhandled Rejection:", error);
});

process.on("uncaughtException", (error) => {
  logger.error("❌ Uncaught Exception:", error);
  // No cerrar el proceso, intentar continuar
});

process.on("SIGINT", () => {
  console.log("\n\n👋 Cerrando IngeniaBot...");
  timeoutService.limpiarTodos(); // Limpiar timeouts

  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\n👋 Cerrando IngeniaBot (SIGTERM)...");
  timeoutService.limpiarTodos(); // Limpiar timeouts

  process.exit(0);
});

// ==================== INICIAR ====================
main();
