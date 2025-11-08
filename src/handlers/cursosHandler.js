// src/handlers/cursosHandler.js
const databaseService = require('../services/databaseService');

async function handleCursos(estudianteId, estudiante) {
  try {
    const cursos = await databaseService.getCursos(estudianteId);
    
    if (cursos.length === 0) {
      return `📚 *Mis Cursos*\n\nAún no tienes cursos registrados en el sistema.\n\n📞 Por favor contacta a la oficina de registro académico para más información.\n\n_Escribe "menú" para volver al inicio_`;
    }

    let mensaje = `📚 *Mis Cursos - Ciclo Actual*\n\n`;
    
    if (estudiante && estudiante.carrera) {
      mensaje += `👤 Carrera: ${estudiante.carrera}\n`;
    }
    if (estudiante && estudiante.semestre) {
      mensaje += `📊 Semestre: ${estudiante.semestre}\n`;
    }
    mensaje += `\n`;

    cursos.forEach((curso, i) => {
      mensaje += `${i + 1}. *${curso.nombre_curso}*\n`;
      mensaje += `   📝 Código: ${curso.codigo_curso}\n`;
      mensaje += `   👨‍🏫 Profesor: ${curso.profesor}\n`;
      mensaje += `   ⭐ Créditos: ${curso.creditos}\n`;
      
      if (curso.horario) {
        mensaje += `   🕐 Horario: ${curso.horario}\n`;
      }
      if (curso.aula) {
        mensaje += `   🚪 Aula: ${curso.aula}\n`;
      }
      
      mensaje += `\n`;
    });

    mensaje += `📊 Total de créditos: ${cursos.reduce((sum, c) => sum + (c.creditos || 0), 0)}\n\n`;
    mensaje += `_Escribe "menú" para volver al inicio_`;

    return mensaje;

  } catch (error) {
    console.error('Error en handleCursos:', error);
    return `❌ Hubo un error al consultar tus cursos.\n\nPor favor intenta nuevamente en unos momentos.\n\n_Escribe "menú" para volver al inicio_`;
  }
}

module.exports = { handleCursos };