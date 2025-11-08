-- database/seed.sql
-- Datos de ejemplo para IngeniaBot

-- ==================== ESTUDIANTES DE EJEMPLO ====================

INSERT INTO estudiantes (telefono, nombre, codigo_estudiante, correo, carrera, semestre) VALUES
('51987581179', 'Juan Jose Illatopa', 'EST2024001', 'juan.perez@universidad.edu.pe', 'Ingeniería de Sistemas', 5),
('51988777666', 'María González López', 'EST2024002', 'maria.gonzalez@universidad.edu.pe', 'Administración de Empresas', 3),
('51977666555', 'Carlos Ramírez Silva', 'EST2024003', 'carlos.ramirez@universidad.edu.pe', 'Arquitectura', 7)
ON CONFLICT (telefono) DO NOTHING;

-- ==================== CURSOS DE EJEMPLO ====================

-- Cursos para Juan Pérez (Ingeniería de Sistemas - 5to semestre)
INSERT INTO cursos (estudiante_id, nombre_curso, codigo_curso, creditos, semestre, profesor, horario, aula) VALUES
(1, 'Desarrollo de Aplicaciones Web', 'IS301', 4, '2024-2', 'Dr. Carlos Mendoza', 'Lun/Mié 10:00-12:00', 'Lab 301'),
(1, 'Base de Datos Avanzadas', 'IS302', 4, '2024-2', 'Mg. Ana Torres', 'Mar/Jue 14:00-16:00', 'Lab 302'),
(1, 'Inteligencia Artificial', 'IS401', 5, '2024-2', 'Dr. Luis Vega', 'Vie 16:00-20:00', 'Aula 201'),
(1, 'Gestión de Proyectos TI', 'IS303', 3, '2024-2', 'Ing. María Silva', 'Mié 18:00-21:00', 'Aula 105'),
(1, 'Arquitectura de Software', 'IS304', 4, '2024-2', 'Dr. Roberto Chang', 'Lun/Mié 16:00-18:00', 'Lab 303')
ON CONFLICT DO NOTHING;

-- Cursos para María González (Administración - 3er semestre)
INSERT INTO cursos (estudiante_id, nombre_curso, codigo_curso, creditos, semestre, profesor, horario, aula) VALUES
(2, 'Marketing Digital', 'ADM201', 3, '2024-2', 'Mg. Patricia Rojas', 'Mar/Jue 10:00-12:00', 'Aula 201'),
(2, 'Finanzas Corporativas', 'ADM202', 4, '2024-2', 'Dr. Jorge Flores', 'Lun/Mié 14:00-16:00', 'Aula 202'),
(2, 'Comportamiento Organizacional', 'ADM203', 3, '2024-2', 'Mg. Sandra Díaz', 'Vie 10:00-13:00', 'Aula 203'),
(2, 'Estadística Empresarial', 'MAT201', 4, '2024-2', 'Dr. Miguel Ángel Ruiz', 'Mar/Jue 16:00-18:00', 'Aula 104')
ON CONFLICT DO NOTHING;

-- Cursos para Carlos Ramírez (Arquitectura - 7mo semestre)
INSERT INTO cursos (estudiante_id, nombre_curso, codigo_curso, creditos, semestre, profesor, horario, aula) VALUES
(3, 'Diseño Arquitectónico V', 'ARQ401', 6, '2024-2', 'Arq. Elena Vargas', 'Lun/Mié/Vie 14:00-18:00', 'Taller 401'),
(3, 'Urbanismo y Planificación', 'ARQ402', 4, '2024-2', 'Mg. Ricardo Ponce', 'Mar/Jue 10:00-12:00', 'Aula 301'),
(3, 'Tecnología de la Construcción', 'ARQ403', 3, '2024-2', 'Ing. Laura Medina', 'Vie 10:00-13:00', 'Aula 302')
ON CONFLICT DO NOTHING;

-- ==================== PAGOS DE EJEMPLO ====================

-- Pagos para Juan Pérez
INSERT INTO pagos (estudiante_id, concepto, monto, estado, fecha_emision, fecha_vencimiento) VALUES
(1, 'Pensión Octubre 2024', 850.00, 'pagado', '2024-10-01', '2024-10-05'),
(1, 'Pensión Noviembre 2024', 850.00, 'pendiente', '2024-11-01', '2024-11-05'),
(1, 'Material de Laboratorio', 150.00, 'pendiente', '2024-11-01', '2024-11-15'),
(1, 'Certificado de Estudios', 50.00, 'pendiente', '2024-11-10', '2024-11-20')
ON CONFLICT DO NOTHING;

-- Pagos para María González
INSERT INTO pagos (estudiante_id, concepto, monto, estado, fecha_emision, fecha_vencimiento) VALUES
(2, 'Pensión Octubre 2024', 750.00, 'pagado', '2024-10-01', '2024-10-05'),
(2, 'Pensión Noviembre 2024', 750.00, 'pagado', '2024-11-01', '2024-11-05'),
(2, 'Seminario de Marketing', 100.00, 'pendiente', '2024-11-08', '2024-11-12')
ON CONFLICT DO NOTHING;

-- Pagos para Carlos Ramírez
INSERT INTO pagos (estudiante_id, concepto, monto, estado, fecha_emision, fecha_vencimiento) VALUES
(3, 'Pensión Octubre 2024', 900.00, 'pagado', '2024-10-01', '2024-10-05'),
(3, 'Pensión Noviembre 2024', 900.00, 'pendiente', '2024-11-01', '2024-11-05'),
(3, 'Material de Taller', 200.00, 'pendiente', '2024-11-05', '2024-11-10')
ON CONFLICT DO NOTHING;

-- ==================== PREGUNTAS FRECUENTES ====================

INSERT INTO preguntas_frecuentes (pregunta, respuesta, categoria) VALUES
-- Biblioteca
(
    '¿Cuál es el horario de la biblioteca?',
    '📚 *Biblioteca Central*

🕐 Horarios:
• Lunes a Viernes: 7:00am - 10:00pm
• Sábados: 8:00am - 6:00pm
• Domingos: Cerrado

📍 Ubicación: Edificio Central, 2do piso

💡 Servicios:
• Préstamo de libros (3 días)
• Salas de estudio grupal
• Computadoras con internet
• Impresiones y copias',
    'servicios'
),

-- Campus Virtual
(
    '¿Cómo recupero mi contraseña del campus virtual?',
    '🔐 *Recuperar Contraseña Campus Virtual*

Pasos:
1️⃣ Ingresa a: campus.universidad.edu.pe
2️⃣ Click en "¿Olvidaste tu contraseña?"
3️⃣ Ingresa tu código de estudiante
4️⃣ Recibirás un correo con instrucciones

⚠️ *Si no funciona:*
• Verifica tu bandeja de SPAM
• Contacta a soporte@universidad.edu.pe
• WhatsApp: +51 999 888 777',
    'soporte'
),

-- Cafetería
(
    '¿Dónde está la cafetería?',
    '☕ *Cafetería Universitaria*

📍 Ubicaciones:
1. *Cafetería Central*
   • Edificio A, 1er piso
   • Menú completo

2. *Food Court*
   • Pabellón de Ingenierías
   • Comida rápida

3. *Café Express*
   • Biblioteca Central
   • Snacks y bebidas

🕐 Horario: 7:00am - 8:00pm
💳 Aceptamos: Efectivo y tarjetas',
    'servicios'
),

-- Costos
(
    '¿Cuánto cuesta el semestre?',
    '💰 *Inversión Académica*

📊 Pensión mensual: S/ 850
💳 Matrícula semestral: S/ 500

✅ *Incluye:*
• Acceso a todas las instalaciones
• Plataforma virtual
• Biblioteca digital
• Seguro estudiantil
• Gimnasio universitario

💡 *Becas disponibles:*
• Excelencia académica
• Situación económica
• Deportiva

📞 Más info: economia@universidad.edu.pe',
    'pagos'
),

-- Certificados
(
    '¿Cómo solicito un certificado de estudios?',
    '📄 *Certificado de Estudios*

📝 *Requisitos:*
• Estar al día en pagos
• DNI vigente
• Pago de S/ 50

🏢 *Proceso:*
1️⃣ Ir a Registro Académico
2️⃣ Llenar solicitud
3️⃣ Realizar pago en caja
4️⃣ Recoger en 3 días hábiles

🕐 Atención: Lun-Vie 9am-5pm
📍 Edificio Central, 1er piso',
    'tramites'
),

-- Carnet
(
    '¿Cómo obtengo mi carnet universitario?',
    '🎫 *Carnet Universitario*

📸 *Requisitos:*
• Estar matriculado
• 1 foto tamaño carnet
• Pago de S/ 30

📍 *Proceso:*
1️⃣ Ir a Registro Académico
2️⃣ Entregar foto y pago
3️⃣ Recoger en 24 horas

✅ *Beneficios:*
• Acceso a instalaciones
• Descuentos en comercios
• Identificación estudiantil

⚠️ *Pérdida:* Duplicado S/ 50',
    'tramites'
),

-- Gimnasio
(
    '¿Cómo uso el gimnasio?',
    '🏋️ *Gimnasio Universitario*

✅ *Acceso:*
• Gratuito para alumnos matriculados
• Presentar carnet universitario

🕐 *Horarios:*
• Lunes a Viernes: 6am-9pm
• Sábados: 8am-2pm
• Domingos: Cerrado

💪 *Instalaciones:*
• Máquinas de cardio
• Pesas libres
• Clases grupales (yoga, pilates)

📋 *Inscripción:*
Pasar por el gimnasio con tu carnet',
    'servicios'
),

-- Psicología
(
    '¿Cómo accedo al servicio de psicología?',
    '🧠 *Servicio de Psicología*

✅ *Atención Gratuita* para estudiantes

📞 *Agendar cita:*
• WhatsApp: +51 999 555 0100
• Email: psicologia@universidad.edu.pe
• Presencial: Bienestar Estudiantil

🕐 *Horario:*
• Lunes a Viernes: 9am-5pm

🔒 *Confidencialidad asegurada*

💡 Servicios:
• Consultas individuales
• Talleres grupales
• Orientación vocacional',
    'bienestar'
);

-- ==================== CONVERSACIONES DE EJEMPLO ====================

-- Algunas conversaciones de prueba (opcional)
INSERT INTO conversaciones (estudiante_id, mensaje, respuesta, es_ia) VALUES
(1, 'Hola', 'Bienvenido a IngeniaBot...', false),
(1, '1', 'Aquí están tus cursos...', false),
(1, '¿Cuál es el horario de la biblioteca?', 'La biblioteca está abierta...', true)
ON CONFLICT DO NOTHING;

-- ==================== MENSAJE DE CONFIRMACIÓN ====================

DO $$
BEGIN
    RAISE NOTICE '✅ Datos de ejemplo insertados exitosamente';
    RAISE NOTICE '👥 3 estudiantes creados';
    RAISE NOTICE '📚 Cursos asignados';
    RAISE NOTICE '💳 Pagos registrados';
    RAISE NOTICE '❓ 8 preguntas frecuentes agregadas';
END $$;