// src/config/database.js
const { Pool } = require("pg");

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Esto permite conectar incluso si el certificado no es verificado por una CA conocida
  },
  max: 10, // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Evento de error
pool.on("error", (err, client) => {
  console.error("❌ Error inesperado en cliente PostgreSQL:", err);
});

// Evento de conexión
pool.on("connect", () => {
  console.log("✅ Nueva conexión a PostgreSQL establecida");
});

// Función para verificar la conexión
async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ Conexión a base de datos exitosa:", result.rows[0].now);
    return true;
  } catch (error) {
    console.error("❌ Error al conectar con base de datos:", error.message);
    return false;
  }
}

module.exports = {
  pool,
  testConnection,
};
