// backend/email-test.js
require('dotenv').config();
const transporter = require('./config/email'); // Usar el transporter configurado

async function testEmail() {
    console.log('📧 PROBANDO CONFIGURACIÓN DE EMAIL\n');
    
    console.log('=== CONFIGURACIÓN ===');
    console.log('EMAIL_HOST:', process.env.EMAIL_HOST || 'NO DEFINIDO');
    console.log('EMAIL_PORT:', process.env.EMAIL_PORT || 'NO DEFINIDO');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'DEFINIDO' : 'NO DEFINIDO');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'DEFINIDO' : 'NO DEFINIDO');
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM || process.env.EMAIL_USER || 'NO DEFINIDO');
    
    try {
        console.log('\n=== VERIFICANDO CONEXIÓN ===');
        await transporter.verify();
        console.log('✅ Conexión con servidor de email establecida');
        
        console.log('\n=== ENVIANDO EMAIL DE PRUEBA ===');
        const info = await transporter.sendMail({
            from: `"Sistema Gestión" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Enviar a ti mismo
            subject: '✅ Test Email - Sistema Gestión Microempresas',
            text: 'Este es un email de prueba del sistema. Si lo recibes, la configuración funciona correctamente.',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #2563eb;">✅ Test de Email Exitoso</h2>
                    <p>Este es un email de prueba del sistema de gestión de microempresas.</p>
                    <p>Si recibes este email, significa que la configuración de email funciona correctamente.</p>
                    <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
                </div>
            `
        });
        
        console.log('✅ Email enviado exitosamente!');
        console.log('📫 Message ID:', info.messageId);
        console.log('👤 Para:', info.accepted.join(', '));
        
        return true;
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('Código:', error.code);
        
        if (error.code === 'EAUTH') {
            console.log('\n🔑 PROBLEMA DE AUTENTICACIÓN');
            console.log('Solución:');
            console.log('1. Ve a https://myaccount.google.com/security');
            console.log('2. Activa "Verificación en dos pasos"');
            console.log('3. Ve a "Contraseñas de aplicaciones"');
            console.log('4. Genera una nueva contraseña para "Otra aplicación"');
            console.log('5. Nómbrala "Sistema Gestión"');
            console.log('6. Copia los 16 caracteres SIN espacios');
            console.log('7. En .env, usa: EMAIL_PASS=los16caracteres');
        }
        
        return false;
    }
}

// Ejecutar
testEmail().then(success => {
    if (success) {
        console.log('\n🎉 ¡Configuración correcta! Revisa tu bandeja de entrada.');
    } else {
        console.log('\n🔧 Revisa la configuración e intenta nuevamente.');
    }
    process.exit();
});