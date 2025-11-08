// src/config/constants.js

const MENU_PRINCIPAL = `*🤖 IngeniaBot - Universidad 2025*

¡Hola! Soy tu asistente virtual. ¿Cómo puedo ayudarte?

📚 *1* - Mis cursos
💳 *2* - Mis pagos
🏥 *3* - Bienestar estudiantil
🔧 *4* - Soporte técnico
🎓 *5* - Admisión 2025

💬 *También puedes hacer preguntas libres*
Escribe tu duda y te responderé con IA

_Escribe el número o tu pregunta_ 👇`;

const RESPUESTA_BIENVENIDA = `👋 ¡Bienvenido a IngeniaBot!

Soy tu asistente virtual 24/7 para ayudarte con todo lo que necesites sobre la universidad.

Escribe *"menú"* o *"hola"* para ver las opciones.`;

const RESPUESTA_NO_ENTENDIDO = `🤔 No estoy seguro de entender tu mensaje.

Escribe *"menú"* para ver las opciones disponibles
O hazme una pregunta sobre la universidad.`;

const MENSAJES_AYUDA = {
  cursos: 'Aquí puedes consultar tus cursos actuales, horarios, profesores y más.',
  pagos: 'Revisa el estado de tus pagos pendientes y realizados.',
  bienestar: 'Información sobre servicios de salud, psicología, deportes y más.',
  soporte: 'Asistencia técnica para problemas con el sistema académico.',
  admision: 'Información sobre el proceso de admisión 2025.'
};

const COMANDOS = {
  MENU: ['menu', 'menú', 'inicio', 'hola', 'hi', 'hey'],
  CURSOS: ['1', 'cursos', 'mis cursos', 'curso'],
  PAGOS: ['2', 'pagos', 'mis pagos', 'pago', 'pension', 'pensión'],
  BIENESTAR: ['3', 'bienestar', 'salud'],
  SOPORTE: ['4', 'soporte', 'ayuda técnica', 'problema'],
  ADMISION: ['5', 'admision', 'admisión', 'postular']
};

const CONFIGURACION_IA = {
  temperatura: 0.7,
  maxTokens: 2048,
  modelo: 'gemini-2.5-flash',
  promptSistema: `Eres IngeniaBot, el asistente virtual oficial de una universidad en Perú.

Tu misión es ayudar a estudiantes con información académica, administrativa y servicios universitarios.

DIRECTRICES:
- Sé amigable, profesional y conciso
- Responde en español claro y sencillo
- Si no sabes algo, sé honesto y redirige al menú principal
- Mantén respuestas cortas (máximo 200 palabras)
- Usa emojis ocasionalmente para ser más cercano
- Si la pregunta no está relacionada con temas universitarios, redirige cortésmente al menú

TEMAS QUE MANEJAS:
- Información académica (cursos, horarios, profesores)
- Procedimientos administrativos (matrícula, certificados, trámites)
- Servicios estudiantiles (biblioteca, cafetería, deportes)
- Pagos y pensiones
- Admisión e inscripciones
- Bienestar estudiantil (psicología, salud)
- Soporte técnico (campus virtual, sistemas)`
};

module.exports = {
  MENU_PRINCIPAL,
  RESPUESTA_BIENVENIDA,
  RESPUESTA_NO_ENTENDIDO,
  MENSAJES_AYUDA,
  COMANDOS,
  CONFIGURACION_IA
};