const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Probar conexión al iniciar
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error conectando a Laragon:', err.message);
    } else {
        console.log('Conectado a la base de datos en Laragon');
        connection.release();
    }
});

module.exports = pool.promise();