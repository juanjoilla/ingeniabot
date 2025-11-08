-- Tabla de citas y eventos
CREATE TABLE IF NOT EXISTS agenda (
    id SERIAL PRIMARY KEY,
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('cita', 'clase', 'examen', 'evento', 'recordatorio')),
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_hora TIMESTAMP NOT NULL,
    duracion_minutos INTEGER DEFAULT 60,
    ubicacion VARCHAR(200),
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'cancelado', 'completado')),
    recordatorio_enviado BOOLEAN DEFAULT false,
    minutos_antes_recordatorio INTEGER DEFAULT 60, -- Recordar 1 hora antes por defecto
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_agenda_estudiante ON agenda(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_agenda_fecha ON agenda(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_agenda_estado ON agenda(estado);
CREATE INDEX IF NOT EXISTS idx_agenda_recordatorio ON agenda(recordatorio_enviado, fecha_hora) 
    WHERE estado IN ('pendiente', 'confirmado');

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_agenda_updated_at ON agenda;
CREATE TRIGGER update_agenda_updated_at
    BEFORE UPDATE ON agenda
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función para obtener próximas citas
CREATE OR REPLACE FUNCTION obtener_proximas_citas(p_estudiante_id INTEGER, p_dias INTEGER DEFAULT 7)
RETURNS TABLE (
    id INTEGER,
    tipo VARCHAR,
    titulo VARCHAR,
    fecha_hora TIMESTAMP,
    ubicacion VARCHAR,
    estado VARCHAR,
    tiempo_restante INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.tipo,
        a.titulo,
        a.fecha_hora,
        a.ubicacion,
        a.estado,
        a.fecha_hora - NOW() as tiempo_restante
    FROM agenda a
    WHERE a.estudiante_id = p_estudiante_id
        AND a.fecha_hora > NOW()
        AND a.fecha_hora < NOW() + (p_dias || ' days')::INTERVAL
        AND a.estado IN ('pendiente', 'confirmado')
    ORDER BY a.fecha_hora ASC;
END;
$$ LANGUAGE plpgsql;

-- Vista de agenda completa
CREATE OR REPLACE VIEW vista_agenda_estudiantes AS
SELECT 
    a.*,
    e.nombre as estudiante_nombre,
    e.telefono,
    CASE 
        WHEN a.fecha_hora < NOW() THEN 'pasado'
        WHEN a.fecha_hora < NOW() + INTERVAL '1 hour' THEN 'proximo'
        WHEN a.fecha_hora < NOW() + INTERVAL '24 hours' THEN 'hoy'
        WHEN a.fecha_hora < NOW() + INTERVAL '7 days' THEN 'esta_semana'
        ELSE 'futuro'
    END as categoria_tiempo
FROM agenda a
JOIN estudiantes e ON a.estudiante_id = e.id;

-- Insertar datos de ejemplo
INSERT INTO agenda (estudiante_id, tipo, titulo, descripcion, fecha_hora, ubicacion, minutos_antes_recordatorio)
VALUES 
    (5, 'cita', 'Consulta Psicológica', 'Primera sesión con el psicólogo', NOW() + INTERVAL '2 days', 'Centro de Bienestar, 2do piso', 60),
    (5, 'clase', 'Clase de Base de Datos', 'Normalización y formas normales', NOW() + INTERVAL '1 day', 'Lab 302', 30),
    (5, 'examen', 'Examen Parcial IA', 'Capítulos 1-5', NOW() + INTERVAL '5 days', 'Aula 201', 1440); -- 24 horas antes

-- Verificar
SELECT * FROM obtener_proximas_citas(5, 7);