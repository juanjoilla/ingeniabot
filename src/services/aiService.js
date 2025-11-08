// src/services/aiService.js
const { generarRespuesta } = require('../config/gemini');
const { CONFIGURACION_IA } = require('../config/constants');
const databaseService = require('./databaseService');

class AIService {
  
  async generarRespuestaIA(pregunta, estudianteId, contexto = {}) {
    try {
      // 1. Buscar primero en preguntas frecuentes
      try {
        const preguntaFrecuente = await databaseService.buscarPreguntaFrecuente(pregunta);
        
        if (preguntaFrecuente && preguntaFrecuente.similitud > 0.65) {
          console.log(`📚 Respondiendo desde FAQ (similitud: ${preguntaFrecuente.similitud})`);
          return {
            respuesta: preguntaFrecuente.respuesta,
            fuente: 'faq',
            similitud: preguntaFrecuente.similitud
          };
        }
      } catch (faqError) {
        console.log('ℹ️  FAQ no disponible, usando IA directamente');
      }

      // 2. Si no hay coincidencia, usar Gemini
      console.log('🤖 Generando respuesta con Gemini AI...');
      
      const prompt = this.construirPrompt(pregunta, contexto);
      console.log('🔍 Prompt construido:\n', prompt.substring(0, 500) + '...');
      
      const respuesta = await generarRespuesta(prompt);
      console.log('🔍 Respuesta generada:', respuesta ? respuesta.substring(0, 100) + '...' : 'VACÍA');

      if (!respuesta || respuesta.trim().length === 0) {
        throw new Error('Gemini devolvió respuesta vacía');
      }

      // 3. Guardar conversación
      try {
        await databaseService.saveConversacion(estudianteId, pregunta, respuesta, true);
      } catch (saveError) {
        console.error('⚠️  Error al guardar conversación:', saveError.message);
      }

      return {
        respuesta,
        fuente: 'gemini'
      };

    } catch (error) {
      console.error('❌ Error al generar respuesta con IA:', error.message);
      console.error('Stack:', error.stack);
      
      // Respuesta de fallback
      return {
        respuesta: `Lo siento, tuve un problema al procesar tu pregunta. 😔\n\n¿Podrías reformularla o escribir *"menú"* para ver las opciones disponibles?`,
        fuente: 'error',
        error: error.message
      };
    }
  }

  construirPrompt(pregunta, contexto = {}) {
    let prompt = CONFIGURACION_IA.promptSistema + '\n\n';

    // Agregar contexto del estudiante si está disponible
    if (contexto.estudiante) {
      prompt += `CONTEXTO DEL ESTUDIANTE:\n`;
      if (contexto.estudiante.nombre) {
        prompt += `- Nombre: ${contexto.estudiante.nombre}\n`;
      }
      if (contexto.estudiante.carrera) {
        prompt += `- Carrera: ${contexto.estudiante.carrera}\n`;
      }
      if (contexto.estudiante.semestre) {
        prompt += `- Semestre: ${contexto.estudiante.semestre}\n`;
      }
      prompt += '\n';
    }

    // Agregar contexto de cursos si está disponible
    if (contexto.cursos && contexto.cursos.length > 0) {
      prompt += `CURSOS ACTUALES:\n`;
      contexto.cursos.forEach(curso => {
        prompt += `- ${curso.nombre_curso} (${curso.codigo_curso})\n`;
      });
      prompt += '\n';
    }

    // Agregar la pregunta
    prompt += `PREGUNTA DEL ESTUDIANTE:\n${pregunta}\n\n`;
    prompt += `INSTRUCCIONES:\n`;
    prompt += `- Responde de forma concisa (máximo 200 palabras)\n`;
    prompt += `- Usa un tono amigable y profesional\n`;
    prompt += `- Si no tienes información suficiente, sé honesto\n`;
    prompt += `- Si la pregunta no es sobre temas universitarios, redirige cortésmente al menú\n`;
    prompt += `- Incluye emojis relevantes para ser más amigable\n\n`;
    prompt += `RESPUESTA:`;

    return prompt;
  }

  // Función para análisis de sentimiento (simple)
  analizarSentimiento(mensaje) {
    const palabrasPositivas = ['gracias', 'excelente', 'perfecto', 'genial', 'bueno', 'bien'];
    const palabrasNegativas = ['malo', 'error', 'problema', 'no funciona', 'ayuda', 'urgente'];

    const textoLower = mensaje.toLowerCase();
    
    let scorePositivo = palabrasPositivas.filter(p => textoLower.includes(p)).length;
    let scoreNegativo = palabrasNegativas.filter(p => textoLower.includes(p)).length;

    if (scorePositivo > scoreNegativo) return 'positivo';
    if (scoreNegativo > scorePositivo) return 'negativo';
    return 'neutral';
  }

  // Función para detectar urgencia
  esUrgente(mensaje) {
    const palabrasUrgentes = ['urgente', 'rápido', 'ahora', 'ya', 'pronto', 'necesito'];
    return palabrasUrgentes.some(p => mensaje.toLowerCase().includes(p));
  }

  // Función para categorizar la pregunta
  categorizarPregunta(pregunta) {
    const preguntaLower = pregunta.toLowerCase();
    
    const categorias = {
      cursos: ['curso', 'clase', 'horario', 'profesor', 'nota', 'examen', 'tarea'],
      pagos: ['pago', 'pensión', 'pension', 'deuda', 'precio', 'costo', 'mensualidad'],
      admision: ['admisión', 'admision', 'postular', 'inscripción', 'inscripcion', 'examen de ingreso'],
      bienestar: ['salud', 'psicólogo', 'psicologo', 'médico', 'medico', 'gimnasio', 'deporte'],
      soporte: ['error', 'no funciona', 'problema técnico', 'acceso', 'contraseña'],
      biblioteca: ['biblioteca', 'libro', 'préstamo', 'prestamo'],
      tramites: ['certificado', 'constancia', 'documento', 'trámite', 'tramite']
    };

    for (const [categoria, palabras] of Object.entries(categorias)) {
      if (palabras.some(p => preguntaLower.includes(p))) {
        return categoria;
      }
    }

    return 'general';
  }
}

module.exports = new AIService();