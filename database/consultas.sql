-- Usuarios activos última semana
SELECT COUNT(DISTINCT estudiante_id) 
FROM conversaciones 
WHERE created_at > NOW() - INTERVAL '7 days';

-- Mensajes por día
SELECT DATE(created_at) as fecha, COUNT(*) as total
FROM conversaciones
GROUP BY DATE(created_at)
ORDER BY fecha DESC;

-- Preguntas más frecuentes
SELECT mensaje, COUNT(*) as veces
FROM conversaciones
WHERE es_ia = true
GROUP BY mensaje
ORDER BY veces DESC
LIMIT 10;