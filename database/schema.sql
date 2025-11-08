-- database/schema.sql
-- Schema para IngeniaBot - Sistema de base de datos

-- Extensión para búsqueda por similitud de texto
CREATE EXTENSION IF NOT EXISTS botrender_261g;

-- ==================== TABLA DE ESTUDIANTES ====================

CREATE TABLE IF NOT EXISTS estudiantes (
    id SERIAL PRIMARY KEY,
    telefono VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100),
    codigo_estudiante VARCHAR(20) UNIQUE,
    correo VARCHAR(100),
    carrera VARCHAR(100),
    semestre INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE estudiantes IS 'Información de estudiantes registrados en el bot';
COMMENT ON COLUMN estudiantes.telefono IS 'Número de WhatsApp sin @ (ej: 51999888777)';

-- ==================== TABLA DE CURSOS ====================

CREATE TABLE IF NOT EXISTS cursos (
    id SERIAL PRIMARY KEY,
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    nombre_curso VARCHAR(200) NOT NULL,
    codigo_curso VARCHAR(20),
    creditos INTEGER DEFAULT 3,
    semestre VARCHAR(10),
    profesor VARCHAR(100),
    horario VARCHAR(100),
    aula VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE cursos IS 'Cursos matriculados por cada estudiante';

-- ==================== TABLA DE PAGOS ====================

CREATE TABLE IF NOT EXISTS pagos (
    id SERIAL PRIMARY KEY,
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    concepto VARCHAR(200) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'vencido')),
    fecha_emision DATE DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE NOT NULL,
    metodo_pago VARCHAR(50),
    referencia VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE pagos IS 'Registro de pagos de estudiantes';
COMMENT ON COLUMN pagos.estado IS 'Estados: pendiente, pagado, vencido';

-- ==================== TABLA DE CONVERSACIONES ====================

CREATE TABLE IF NOT EXISTS conversaciones (
    id SERIAL PRIMARY KEY,
    estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    mensaje TEXT NOT NULL,
    respuesta TEXT NOT NULL,
    es_ia BOOLEAN DEFAULT false,
    categoria VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE conversaciones IS 'Historial de conversaciones del bot';
COMMENT ON COLUMN conversaciones.es_ia IS 'TRUE si la respuesta fue generada por IA';

-- ==================== TABLA DE PREGUNTAS FRECUENTES ====================

CREATE TABLE IF NOT EXISTS preguntas_frecuentes (
    id SERIAL PRIMARY KEY,
    pregunta TEXT NOT NULL,
    respuesta TEXT NOT NULL,
    categoria VARCHAR(50),
    usos INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE preguntas_frecuentes IS 'Cache de preguntas frecuentes para respuestas rápidas';
COMMENT ON COLUMN preguntas_frecuentes.usos IS 'Contador de cuántas veces se ha usado esta respuesta';

-- ==================== ÍNDICES PARA OPTIMIZACIÓN ====================

-- Índices en estudiantes
CREATE INDEX IF NOT EXISTS idx_estudiantes_telefono ON estudiantes(telefono);
CREATE INDEX IF NOT EXISTS idx_estudiantes_codigo ON estudiantes(codigo_estudiante);

-- Índices en cursos
CREATE INDEX IF NOT EXISTS idx_cursos_estudiante ON cursos(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_cursos_codigo ON cursos(codigo_curso);

-- Índices en pagos
CREATE INDEX IF NOT EXISTS idx_pagos_estudiante ON pagos(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_vencimiento ON pagos(fecha_vencimiento);

-- Índices en conversaciones
CREATE INDEX IF NOT EXISTS idx_conversaciones_estudiante ON conversaciones(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_conversaciones_fecha ON conversaciones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversaciones_ia ON conversaciones(es_ia);

-- Índice para búsqueda por similitud en preguntas frecuentes
CREATE INDEX IF NOT EXISTS idx_preguntas_texto ON preguntas_frecuentes USING gin(pregunta gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_preguntas_categoria ON preguntas_frecuentes(categoria);

-- ==================== FUNCIONES Y TRIGGERS ====================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para estudiantes
DROP TRIGGER IF EXISTS update_estudiantes_updated_at ON estudiantes;
CREATE TRIGGER update_estudiantes_updated_at
    BEFORE UPDATE ON estudiantes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para preguntas_frecuentes
DROP TRIGGER IF EXISTS update_preguntas_frecuentes_updated_at ON preguntas_frecuentes;
CREATE TRIGGER update_preguntas_frecuentes_updated_at
    BEFORE UPDATE ON preguntas_frecuentes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==================== VISTAS ÚTILES ====================

-- Vista de estudiantes con estadísticas
CREATE OR REPLACE VIEW vista_estudiantes_stats AS
SELECT 
    e.id,
    e.telefono,
    e.nombre,
    e.carrera,
    e.semestre,
    COUNT(DISTINCT cu.id) as total_cursos,
    COUNT(DISTINCT p.id) as total_pagos,
    COUNT(DISTINCT conv.id) as total_conversaciones,
    MAX(conv.created_at) as ultima_interaccion
FROM estudiantes e
LEFT JOIN cursos cu ON e.id = cu.estudiante_id
LEFT JOIN pagos p ON e.id = p.estudiante_id
LEFT JOIN conversaciones conv ON e.id = conv.estudiante_id
GROUP BY e.id;

-- Vista de pagos pendientes por vencer
CREATE OR REPLACE VIEW vista_pagos_por_vencer AS
SELECT 
    e.nombre,
    e.telefono,
    p.concepto,
    p.monto,
    p.fecha_vencimiento,
    CURRENT_DATE - p.fecha_vencimiento as dias_vencidos
FROM pagos p
JOIN estudiantes e ON p.estudiante_id = e.id
WHERE p.estado = 'pendiente'
ORDER BY p.fecha_vencimiento;

-- ==================== DATOS INICIALES ====================

-- Insertar categorías predefinidas para preguntas frecuentes
DO $$
BEGIN
    -- Esta tabla servirá de referencia para categorías
    -- Los datos de ejemplo se insertarán en seed.sql
END $$;

-- ==================== PERMISOS (si es necesario) ====================

-- Comentar estas líneas si no tienes un usuario específico
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tu_usuario;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tu_usuario;

-- ==================== INFORMACIÓN DEL SCHEMA ====================

DO $$
BEGIN
    RAISE NOTICE '✅ Schema de IngeniaBot creado exitosamente';
    RAISE NOTICE '📊 Tablas creadas: estudiantes, cursos, pagos, conversaciones, preguntas_frecuentes';
    RAISE NOTICE '🔍 Índices creados para optimización';
    RAISE NOTICE '⚡ Triggers configurados para updated_at';
    RAISE NOTICE '📈 Vistas creadas para estadísticas';
END $$;