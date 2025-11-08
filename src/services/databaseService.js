// src/services/databaseService.js
const { pool } = require('../config/database');

class DatabaseService {
  
  // ==================== ESTUDIANTES ====================
  
  async getEstudiante(telefono) {
    try {
      const result = await pool.query(
        'SELECT * FROM estudiantes WHERE telefono = $1',
        [telefono]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error al obtener estudiante:', error);
      throw error;
    }
  }

  async createEstudiante(telefono, nombre = null) {
    try {
      const result = await pool.query(
        'INSERT INTO estudiantes (telefono, nombre) VALUES ($1, $2) RETURNING *',
        [telefono, nombre]
      );
      console.log(`✅ Nuevo estudiante registrado: ${telefono}`);
      return result.rows[0];
    } catch (error) {
      console.error('Error al crear estudiante:', error);
      throw error;
    }
  }

  async updateEstudiante(id, data) {
    try {
      const { nombre, correo, carrera, semestre } = data;
      const result = await pool.query(
        `UPDATE estudiantes 
         SET nombre = COALESCE($2, nombre),
             correo = COALESCE($3, correo),
             carrera = COALESCE($4, carrera),
             semestre = COALESCE($5, semestre),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, nombre, correo, carrera, semestre]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error al actualizar estudiante:', error);
      throw error;
    }
  }

  // ==================== CURSOS ====================

  async getCursos(estudianteId) {
    try {
      const result = await pool.query(
        'SELECT * FROM cursos WHERE estudiante_id = $1 ORDER BY nombre_curso',
        [estudianteId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error al obtener cursos:', error);
      throw error;
    }
  }

  async getCurso(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM cursos WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error al obtener curso:', error);
      throw error;
    }
  }

  // ==================== PAGOS ====================

  async getPagos(estudianteId) {
    try {
      const result = await pool.query(
        `SELECT * FROM pagos 
         WHERE estudiante_id = $1 
         ORDER BY fecha_vencimiento DESC`,
        [estudianteId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error al obtener pagos:', error);
      throw error;
    }
  }

  async getPagosPendientes(estudianteId) {
    try {
      const result = await pool.query(
        `SELECT * FROM pagos 
         WHERE estudiante_id = $1 AND estado = 'pendiente'
         ORDER BY fecha_vencimiento`,
        [estudianteId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error al obtener pagos pendientes:', error);
      throw error;
    }
  }

  // ==================== CONVERSACIONES ====================

  async saveConversacion(estudianteId, mensaje, respuesta, esIA = false) {
    try {
      await pool.query(
        `INSERT INTO conversaciones (estudiante_id, mensaje, respuesta, es_ia) 
         VALUES ($1, $2, $3, $4)`,
        [estudianteId, mensaje, respuesta, esIA]
      );
    } catch (error) {
      console.error('Error al guardar conversación:', error);
      // No lanzar error para no interrumpir el flujo
    }
  }

  async getConversacionesRecientes(estudianteId, limite = 10) {
    try {
      const result = await pool.query(
        `SELECT * FROM conversaciones 
         WHERE estudiante_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [estudianteId, limite]
      );
      return result.rows;
    } catch (error) {
      console.error('Error al obtener conversaciones:', error);
      return [];
    }
  }

  // ==================== PREGUNTAS FRECUENTES ====================

  async buscarPreguntaFrecuente(pregunta) {
    try {
      const result = await pool.query(
        `SELECT *, SIMILARITY(pregunta, $1) as similitud
         FROM preguntas_frecuentes 
         WHERE SIMILARITY(pregunta, $1) > 0.5
         ORDER BY similitud DESC 
         LIMIT 1`,
        [pregunta]
      );
      
      if (result.rows.length > 0) {
        // Incrementar contador de usos
        await pool.query(
          'UPDATE preguntas_frecuentes SET usos = usos + 1 WHERE id = $1',
          [result.rows[0].id]
        );
        return result.rows[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error al buscar pregunta frecuente:', error);
      return null;
    }
  }

  async agregarPreguntaFrecuente(pregunta, respuesta, categoria = null) {
    try {
      const result = await pool.query(
        `INSERT INTO preguntas_frecuentes (pregunta, respuesta, categoria) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [pregunta, respuesta, categoria]
      );
      console.log(`✅ Nueva pregunta frecuente agregada: ${pregunta.substring(0, 50)}...`);
      return result.rows[0];
    } catch (error) {
      console.error('Error al agregar pregunta frecuente:', error);
      throw error;
    }
  }

  // ==================== ESTADÍSTICAS ====================

  async getEstadisticas() {
    try {
      const [usuariosActivos, totalConversaciones, usosIA] = await Promise.all([
        pool.query(`
          SELECT COUNT(DISTINCT estudiante_id) as total
          FROM conversaciones
          WHERE created_at > NOW() - INTERVAL '7 days'
        `),
        pool.query('SELECT COUNT(*) as total FROM conversaciones'),
        pool.query(`
          SELECT COUNT(*) as total 
          FROM conversaciones 
          WHERE es_ia = true
        `)
      ]);

      return {
        usuariosActivos: parseInt(usuariosActivos.rows[0].total),
        totalConversaciones: parseInt(totalConversaciones.rows[0].total),
        usosIA: parseInt(usosIA.rows[0].total),
        porcentajeIA: (parseInt(usosIA.rows[0].total) / parseInt(totalConversaciones.rows[0].total) * 100).toFixed(2)
      };
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      return null;
    }
  }
}

module.exports = new DatabaseService();