// src/config/gemini.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { CONFIGURACION_IA } = require('./constants');

// Verificar que existe la API Key
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY no está configurada en las variables de entorno');
  process.exit(1);
}

// Inicializar cliente de Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Obtener modelo
const model = genAI.getGenerativeModel({ 
  model: CONFIGURACION_IA.modelo 
});

// Configuración de generación
const generationConfig = {
  temperature: CONFIGURACION_IA.temperatura,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: CONFIGURACION_IA.maxTokens,
};

// Función helper para generar contenido
async function generarRespuesta(prompt) {
  try {
    console.log('📤 Enviando petición a Gemini...');
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });
    
    const response = result.response;
    
    // Debug: Ver la respuesta completa
    console.log('🔍 Response object:', JSON.stringify(response, null, 2));
    
    // Verificar si hay candidatos
    if (!response.candidates || response.candidates.length === 0) {
      console.error('❌ No hay candidatos en la respuesta');
      throw new Error('Gemini no generó respuestas candidatas');
    }
    
    const candidate = response.candidates[0];
    
    // Verificar razón de finalización
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      console.error('⚠️  Razón de finalización:', candidate.finishReason);
      
      if (candidate.finishReason === 'SAFETY') {
        throw new Error('Respuesta bloqueada por filtros de seguridad de Gemini');
      }
      if (candidate.finishReason === 'RECITATION') {
        throw new Error('Respuesta bloqueada por posible repetición de contenido');
      }
    }
    
    // Obtener texto
    const text = response.text();
    
    console.log('📥 Respuesta recibida de Gemini:', text ? `OK (${text.length} caracteres)` : 'VACÍA');
    
    if (!text || text.trim().length === 0) {
      throw new Error('Gemini devolvió respuesta vacía');
    }
    
    return text;
  } catch (error) {
    console.error('❌ Error detallado en Gemini:');
    console.error('   Mensaje:', error.message);
    console.error('   Tipo:', error.constructor.name);
    
    if (error.message.includes('API key')) {
      throw new Error('API Key de Gemini inválida o expirada');
    }
    if (error.message.includes('quota')) {
      throw new Error('Límite de uso de Gemini alcanzado');
    }
    if (error.message.includes('SAFETY')) {
      throw new Error('Contenido bloqueado por seguridad. Intenta reformular tu pregunta.');
    }
    
    throw error;
  }
}

// Función para verificar la API
async function testGeminiAPI() {
  try {
    const result = await model.generateContent('Di "API funcionando correctamente"');
    const response = await result.response;
    console.log('✅ Gemini API funcionando:', response.text().substring(0, 50) + '...');
    return true;
  } catch (error) {
    console.error('❌ Error al probar Gemini API:', error.message);
    return false;
  }
}

module.exports = {
  model,
  generarRespuesta,
  testGeminiAPI
};