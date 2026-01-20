// backend/config/email.js
const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('📧 Configurando transporte de email...');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verificar la conexión al iniciar
transporter.verify(function (error, success) {
    if (error) {
        console.log('❌ Error configurando email:', error.message);
    } else {
        console.log('✅ Servidor de email configurado');
    }
});

module.exports = transporter;